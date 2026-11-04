import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export class BoardPage extends BasePage {
  // Sidebar elements
  readonly sidebar: Locator;
  readonly brandLogo: Locator;
  readonly brandTitle: Locator;
  readonly userAvatar: Locator;
  readonly projectsHeader: Locator;
  readonly toggleProjectFormButton: Locator;
  readonly projectNameInput: Locator;
  readonly addProjectButton: Locator;
  readonly projectItems: Locator;
  readonly emptyBoardPrompt: Locator;

  // Board Header & Controls
  readonly projectTitleHeading: Locator;
  readonly newTaskButton: Locator;
  readonly searchInput: Locator;
  readonly priorityFilter: Locator;

  // Kanban Columns
  readonly columns: Locator;

  // Task Modal elements
  readonly modal: Locator;
  readonly modalHeader: Locator;
  readonly taskTitleInput: Locator;
  readonly taskStatusSelect: Locator;
  readonly taskPrioritySelect: Locator;
  readonly taskDescriptionInput: Locator;
  readonly saveTaskButton: Locator;
  readonly cancelModalButton: Locator;
  readonly deleteTaskButton: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar
    this.sidebar = page.locator('.sidebar');
    this.brandLogo = page.locator('.sidebar-brand img');
    this.brandTitle = page.locator('.sidebar-brand span');
    this.userAvatar = page.locator('.sidebar-title').first();
    this.projectsHeader = page.locator('.sidebar-title', { hasText: 'Your Projects' });
    this.toggleProjectFormButton = this.projectsHeader.locator('svg');
    this.projectNameInput = page.getByPlaceholder('Project name...');
    this.addProjectButton = page.getByRole('button', { name: 'Add' });
    this.projectItems = page.locator('.project-item');
    this.emptyBoardPrompt = page.getByRole('heading', { name: 'Select or create a project to begin' });

    // Board Header
    this.projectTitleHeading = page.locator('.board-header h1');
    this.newTaskButton = page.getByRole('button', { name: /New Task/i });
    this.searchInput = page.getByPlaceholder('Search tasks...');
    this.priorityFilter = page.locator('.priority-filter select');

    // Kanban
    this.columns = page.locator('.column');

    // Modal
    this.modal = page.locator('.modal-content');
    this.modalHeader = page.locator('.modal-header h2');
    this.taskTitleInput = page.getByPlaceholder('e.g. Design homepage hero');
    this.taskStatusSelect = page.locator('.form-group', { hasText: 'Status' }).locator('select');
    this.taskPrioritySelect = page.locator('.form-group', { hasText: 'Priority' }).locator('select');
    this.taskDescriptionInput = page.getByPlaceholder('Add more details to this task...');
    this.saveTaskButton = page.getByRole('button', { name: /Save Task/i });
    this.cancelModalButton = page.getByRole('button', { name: 'Cancel' });
    this.deleteTaskButton = page.getByRole('button', { name: 'Delete' });
  }

  async goto(): Promise<void> {
    await this.navigate('/');
    await expect(this.sidebar).toBeVisible();
  }

  async createProject(name: string): Promise<void> {
    const isInputVisible = await this.projectNameInput.isVisible().catch(() => false);
    if (!isInputVisible) {
      await this.toggleProjectFormButton.click();
    }
    await this.projectNameInput.fill(name);
    await this.addProjectButton.click();
    await expect(this.projectItemByName(name)).toBeVisible();
  }

  projectItemByName(name: string): Locator {
    return this.page.locator('.project-item', { hasText: name }).first();
  }

  async selectProject(name: string): Promise<void> {
    const item = this.projectItemByName(name);
    await expect(item).toBeVisible();
    await item.click();
    await expect(this.projectTitleHeading).toHaveText(name);
  }

  async ensureProject(name: string): Promise<void> {
    // Allow project list to populate from API
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(500);

    const item = this.projectItemByName(name);
    const count = await this.page.locator('.project-item', { hasText: name }).count();
    if (count === 0) {
      await this.createProject(name);
    }
    await this.selectProject(name);
  }

  columnByStatus(status: TaskStatus): Locator {
    return this.page.locator('.column', { hasText: status });
  }

  taskCardByTitle(title: string): Locator {
    return this.page.locator('.task-card', { hasText: title });
  }

  async createTask(input: TaskInput): Promise<void> {
    await this.newTaskButton.click();
    await expect(this.modal).toBeVisible();
    await expect(this.modalHeader).toHaveText('Create Task');

    await this.taskTitleInput.fill(input.title);

    if (input.status) {
      await this.taskStatusSelect.selectOption(input.status);
    }

    if (input.priority) {
      await this.taskPrioritySelect.selectOption(input.priority);
    }

    if (input.description) {
      await this.taskDescriptionInput.fill(input.description);
    }

    await this.saveTaskButton.click();
    await expect(this.modal).toBeHidden();
    await expect(this.taskCardByTitle(input.title)).toBeVisible();
  }

  async openTask(title: string): Promise<void> {
    const card = this.taskCardByTitle(title);
    await expect(card).toBeVisible();
    await card.click();
    await expect(this.modal).toBeVisible();
    await expect(this.modalHeader).toHaveText('Edit Task');
  }

  async updateTask(
    currentTitle: string,
    updates: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
    }
  ): Promise<void> {
    await this.openTask(currentTitle);

    if (updates.title) {
      await this.taskTitleInput.fill(updates.title);
    }

    if (updates.status) {
      await this.taskStatusSelect.selectOption(updates.status);
    }

    if (updates.priority) {
      await this.taskPrioritySelect.selectOption(updates.priority);
    }

    if (updates.description !== undefined) {
      await this.taskDescriptionInput.fill(updates.description);
    }

    await this.saveTaskButton.click();
    await expect(this.modal).toBeHidden();

    const expectedTitle = updates.title || currentTitle;
    await expect(this.taskCardByTitle(expectedTitle)).toBeVisible();
  }

  async deleteTask(title: string): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await this.openTask(title);
    await this.deleteTaskButton.click();
    await expect(this.modal).toBeHidden();
    await expect(this.taskCardByTitle(title)).toBeHidden();
  }

  async searchTasks(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async filterByPriority(priority: 'All' | TaskPriority): Promise<void> {
    await this.priorityFilter.selectOption(priority);
  }

  async getCardCountForColumn(status: TaskStatus): Promise<number> {
    const col = this.columnByStatus(status);
    return col.locator('.task-card').count();
  }
}
