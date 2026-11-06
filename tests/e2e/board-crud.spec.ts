import { test, expect } from '@playwright/test';
import { BoardPage } from '../../pages/BoardPage';

test.describe('Board & Task Lifecycle Management', () => {
  test.describe.configure({ mode: 'serial' });

  let boardPage: BoardPage;
  const testRunId = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`;
  const projectName = `Platform Sprint ${testRunId}`;
  const taskTitle = `Telemetry Ingest ${testRunId}`;
  const updatedTitle = `Telemetry Ingest ${testRunId} (Optimized)`;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    await boardPage.goto();
  });

  test('should initialize and select a project workspace', async () => {
    await boardPage.ensureProject(projectName);

    await expect(boardPage.projectTitleHeading).toHaveText(projectName);
    await expect(boardPage.columnByStatus('To Do')).toBeVisible();
    await expect(boardPage.columnByStatus('In Progress')).toBeVisible();
    await expect(boardPage.columnByStatus('Done')).toBeVisible();
  });

  test('should enforce form validation in task creation modal', async () => {
    await boardPage.ensureProject(projectName);
    await boardPage.newTaskButton.click();
    await expect(boardPage.modal).toBeVisible();

    // Verify Save Task is disabled when title is empty
    await expect(boardPage.saveTaskButton).toBeDisabled();

    // Entering a title enables the submit action
    await boardPage.taskTitleInput.fill('Temporary Title Validation');
    await expect(boardPage.saveTaskButton).toBeEnabled();

    // Clearing title disables it again
    await boardPage.taskTitleInput.fill('');
    await expect(boardPage.saveTaskButton).toBeDisabled();

    await boardPage.cancelModalButton.click();
    await expect(boardPage.modal).toBeHidden();
  });

  test('should create a new task and display it under To Do column', async () => {
    await boardPage.ensureProject(projectName);

    await boardPage.createTask({
      title: taskTitle,
      description: 'Streamline telemetry ingest with Kafka consumer partition rebalancing',
      status: 'To Do',
      priority: 'High',
    });

    const card = boardPage.taskCardByTitle(taskTitle);
    await expect(card).toBeVisible();

    const toDoColumn = boardPage.columnByStatus('To Do');
    await expect(toDoColumn.locator('.task-card').filter({ hasText: taskTitle })).toBeVisible();
    await expect(boardPage.priorityBadgeForCard(taskTitle)).toHaveText('High');
  });

  test('should search and filter tasks by title and priority', async () => {
    await boardPage.ensureProject(projectName);

    await boardPage.searchTasks(taskTitle);
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();

    await boardPage.searchTasks('Nonexistent-Task-Random-Query-12345');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeHidden();

    await boardPage.searchTasks('');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();

    await boardPage.filterByPriority('High');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();

    await boardPage.filterByPriority('Low');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeHidden();

    await boardPage.filterByPriority('All');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();
  });

  test('should edit task status, title, and verify move across columns', async () => {
    await boardPage.ensureProject(projectName);

    await boardPage.updateTask(taskTitle, {
      title: updatedTitle,
      status: 'In Progress',
      priority: 'Medium',
      description: 'Updated pipeline spec with backpressure metrics',
    });

    const inProgressColumn = boardPage.columnByStatus('In Progress');
    await expect(inProgressColumn.locator('.task-card').filter({ hasText: updatedTitle })).toBeVisible();

    const toDoColumn = boardPage.columnByStatus('To Do');
    await expect(toDoColumn.locator('.task-card').filter({ hasText: updatedTitle })).toBeHidden();
    await expect(boardPage.priorityBadgeForCard(updatedTitle)).toHaveText('Medium');
  });

  test('should delete task and confirm removal from board', async () => {
    await boardPage.ensureProject(projectName);

    await boardPage.deleteTask(updatedTitle);

    await expect(boardPage.taskCardByTitle(updatedTitle)).toBeHidden();
  });
});
