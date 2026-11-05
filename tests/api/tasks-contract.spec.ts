import { test, expect, APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  TaskSchema,
  TaskListSchema,
  ProjectSchema,
  ApiErrorSchema,
} from '../../schemas/task.schema';

const apiUrl = process.env.API_BASE_URL || 'https://mern-agile-tracker.onrender.com';
const authFile = path.resolve(__dirname, '../../playwright/.auth/user.json');

function getAuthToken(): string | null {
  try {
    if (fs.existsSync(authFile)) {
      const data = JSON.parse(fs.readFileSync(authFile, 'utf8'));
      const tokenItem = data.origins?.[0]?.localStorage?.find((item: { name: string }) => item.name === 'token');
      return tokenItem?.value || null;
    }
  } catch {
    return null;
  }
  return null;
}

test.describe('Task API Contract & Security Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let testProjectId: string;
  let createdTaskId: string;

  async function ensureTestTask(request: APIRequestContext): Promise<string> {
    if (createdTaskId) return createdTaskId;
    const res = await request.post(`${apiUrl}/api/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'TLS Ingress Controller',
        description: 'Automated cert-manager provisioning',
        status: 'To Do',
        priority: 'High',
        project: testProjectId,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    const task = TaskSchema.parse(body);
    createdTaskId = task._id;
    return createdTaskId;
  }

  test.beforeAll(async ({ request }) => {
    // Retrieve token from session state or authenticate directly
    const storedToken = getAuthToken();
    if (storedToken) {
      token = storedToken;
    } else {
      const email = process.env.TEST_USER_EMAIL || 'automation_runner@test.com';
      const password = process.env.TEST_USER_PASSWORD || 'TestSecret123!';
      const res = await request.post(`${apiUrl}/api/auth/login`, {
        data: { email, password },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      token = body.token;
    }

    // Create a dedicated project fixture for task contract tests
    const projectRes = await request.post(`${apiUrl}/api/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Contract Test Project ${Date.now()}`,
        description: 'Fixture project for automated API contract verification',
      },
    });

    expect(projectRes.status()).toBe(201);
    const projectBody = await projectRes.json();
    const validatedProject = ProjectSchema.parse(projectBody);
    testProjectId = validatedProject._id;
  });

  test.describe('Schema & Contract Adherence', () => {
    test('POST /api/tasks should create task matching TaskSchema model', async ({ request }) => {
      const taskPayload = {
        title: 'Implement TLS Termination',
        description: 'Configure ingress controller with cert-manager automated renewal',
        status: 'To Do',
        priority: 'High',
        project: testProjectId,
      };

      const res = await request.post(`${apiUrl}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: taskPayload,
      });

      expect(res.status()).toBe(201);
      const body = await res.json();

      // Assert payload strictly conforms to Zod contract
      const task = TaskSchema.parse(body);
      createdTaskId = task._id;

      expect(task.title).toBe(taskPayload.title);
      expect(task.description).toBe(taskPayload.description);
      expect(task.status).toBe('To Do');
      expect(task.priority).toBe('High');
      expect(task.project).toBe(testProjectId);
    });

    test('GET /api/tasks/project/:projectId should return TaskListSchema collection', async ({ request }) => {
      await ensureTestTask(request);

      const res = await request.get(`${apiUrl}/api/tasks/project/${testProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      // Assert array adherence to schema
      const taskList = TaskListSchema.parse(body);
      expect(taskList.length).toBeGreaterThanOrEqual(1);

      const foundTask = taskList.find((t) => t._id === createdTaskId);
      expect(foundTask).toBeDefined();
    });

    test('PUT /api/tasks/:taskId should update attributes and conform to schema', async ({ request }) => {
      const taskId = await ensureTestTask(request);

      const updatePayload = {
        title: 'Implement TLS Termination (Deployed)',
        status: 'Done',
        priority: 'Medium',
        description: 'Verified with Let’s Encrypt production cluster issuer',
      };

      const res = await request.put(`${apiUrl}/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: updatePayload,
      });

      expect(res.status()).toBe(200);
      const body = await res.json();

      const updatedTask = TaskSchema.parse(body);
      expect(updatedTask._id).toBe(taskId);
      expect(updatedTask.title).toBe(updatePayload.title);
      expect(updatedTask.status).toBe('Done');
      expect(updatedTask.priority).toBe('Medium');
    });

    test('POST /api/tasks should return 400 Validation Error on missing required fields', async ({ request }) => {
      const res = await request.post(`${apiUrl}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          // Missing title and project
          description: 'Malformed payload without required attributes',
        },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      const error = ApiErrorSchema.parse(body);
      expect(error.message).toMatch(/Validation error/i);
    });

    test('DELETE /api/tasks/:taskId should remove task and return 200', async ({ request }) => {
      const taskId = await ensureTestTask(request);

      const res = await request.delete(`${apiUrl}/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status()).toBe(200);

      // Verify task is no longer returned in project task listing
      const verifyRes = await request.get(`${apiUrl}/api/tasks/project/${testProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await verifyRes.json();
      const taskList = TaskListSchema.parse(body);
      expect(taskList.some((t) => t._id === taskId)).toBeFalsy();
    });
  });

  test.describe('Security & 401 Authorization Boundaries', () => {
    test('GET /api/tasks/project/:projectId should reject unauthenticated requests with 401', async ({ request }) => {
      const res = await request.get(`${apiUrl}/api/tasks/project/${testProjectId}`);

      expect(res.status()).toBe(401);
      const body = await res.json();
      const error = ApiErrorSchema.parse(body);
      expect(error.message).toMatch(/Unauthorized: No token provided/i);
    });

    test('GET /api/tasks/project/:projectId should reject forged token with 401', async ({ request }) => {
      const res = await request.get(`${apiUrl}/api/tasks/project/${testProjectId}`, {
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered_signature',
        },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      const error = ApiErrorSchema.parse(body);
      expect(error.message).toMatch(/Unauthorized: Invalid token/i);
    });

    test('POST /api/tasks should reject unauthenticated creation with 401', async ({ request }) => {
      const res = await request.post(`${apiUrl}/api/tasks`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Unauthenticated Task',
          project: testProjectId,
        },
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      const error = ApiErrorSchema.parse(body);
      expect(error.message).toMatch(/Unauthorized/i);
    });

    test('DELETE /api/tasks/:taskId should reject unauthenticated deletion with 401', async ({ request }) => {
      const res = await request.delete(`${apiUrl}/api/tasks/000000000000000000000000`);

      expect(res.status()).toBe(401);
      const body = await res.json();
      const error = ApiErrorSchema.parse(body);
      expect(error.message).toMatch(/Unauthorized/i);
    });
  });
});
