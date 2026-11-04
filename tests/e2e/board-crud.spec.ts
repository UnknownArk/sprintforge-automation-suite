import { test, expect } from '@playwright/test';
import { BoardPage } from '../../pages/BoardPage';

test.describe('Board & Task Lifecycle Management', () => {
  // Serial mode guarantees deterministic execution of the full CRUD lifecycle
  test.describe.configure({ mode: 'serial' });

  let boardPage: BoardPage;
  const testRunId = Date.now().toString().slice(-5);
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
    await expect(toDoColumn.locator('.task-card', { hasText: taskTitle })).toBeVisible();
    await expect(card.locator('.badge, span')).toContainText('High');
  });

  test('should search and filter tasks by title and priority', async () => {
    await boardPage.ensureProject(projectName);

    // Filter by matching search query
    await boardPage.searchTasks(taskTitle);
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();

    // Filter by non-matching query
    await boardPage.searchTasks('Nonexistent-Task-Random-Query-12345');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeHidden();

    // Reset search
    await boardPage.searchTasks('');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();

    // Filter by High priority
    await boardPage.filterByPriority('High');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeVisible();

    // Filter by Low priority (card is High, so should hide)
    await boardPage.filterByPriority('Low');
    await expect(boardPage.taskCardByTitle(taskTitle)).toBeHidden();

    // Reset priority filter
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

    // Verify card moved from To Do to In Progress
    const inProgressColumn = boardPage.columnByStatus('In Progress');
    await expect(inProgressColumn.locator('.task-card', { hasText: updatedTitle })).toBeVisible();

    const toDoColumn = boardPage.columnByStatus('To Do');
    await expect(toDoColumn.locator('.task-card', { hasText: updatedTitle })).toBeHidden();
  });

  test('should delete task and confirm removal from board', async () => {
    await boardPage.ensureProject(projectName);

    await boardPage.deleteTask(updatedTitle);

    await expect(boardPage.taskCardByTitle(updatedTitle)).toBeHidden();
  });
});
