(() => {
  const STORAGE_KEY = "campus-cash-tracker";
  const CATEGORIES = [
    "Food",
    "Transport",
    "Books & supplies",
    "Housing",
    "Entertainment",
    "Other",
  ];

  const budgetForm = document.querySelector("#budget-form");
  const budgetInput = document.querySelector("#budget-amount");
  const expenseForm = document.querySelector("#expense-form");
  const expenseNameInput = document.querySelector("#expense-name");
  const expenseAmountInput = document.querySelector("#expense-amount");
  const expenseCategoryInput = document.querySelector("#expense-category");
  const expenseDateInput = document.querySelector("#expense-date");
  const budgetSummary = document.querySelector("#budget-summary");
  const spentSummary = document.querySelector("#spent-summary");
  const remainingSummary = document.querySelector("#remaining-summary");
  const expenseList = document.querySelector("#expense-list");
  const expenseCount = document.querySelector(".history-count");
  const statusMessage = document.querySelector("#tracker-status");

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  });

  let state = readStoredState();

  budgetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearStatus();

    if (!budgetForm.reportValidity()) {
      return;
    }

    const budgetCents = parseAmountInCents(budgetInput.value);
    if (budgetCents === null) {
      showStatus("Enter a valid budget greater than $0.00.", "error");
      budgetInput.focus();
      return;
    }

    const nextState = { ...state, budgetCents };
    if (!saveState(nextState)) {
      return;
    }

    state = nextState;
    render();
    budgetInput.value = "";
    showStatus("Budget saved.");
  });

  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearStatus();

    if (!expenseForm.reportValidity()) {
      return;
    }

    const name = expenseNameInput.value.trim();
    const amountCents = parseAmountInCents(expenseAmountInput.value);
    const category = expenseCategoryInput.value;
    const date = expenseDateInput.value;

    if (name.length === 0 || name.length > 80) {
      showStatus("Enter an expense name between 1 and 80 characters.", "error");
      expenseNameInput.focus();
      return;
    }

    if (amountCents === null) {
      showStatus("Enter a valid expense amount greater than $0.00.", "error");
      expenseAmountInput.focus();
      return;
    }

    const totalSpentCents = state.expenses.reduce(
      (total, expense) => total + expense.amountCents,
      0,
    );
    if (amountCents > Number.MAX_SAFE_INTEGER - totalSpentCents) {
      showStatus("The total expenses exceed the maximum supported amount.", "error");
      expenseAmountInput.focus();
      return;
    }

    if (!CATEGORIES.includes(category)) {
      showStatus("Choose a valid expense category.", "error");
      expenseCategoryInput.focus();
      return;
    }

    if (!isValidDate(date)) {
      showStatus("Enter a valid expense date.", "error");
      expenseDateInput.focus();
      return;
    }

    const expense = {
      id: createId(),
      name,
      amountCents,
      category,
      date,
    };
    const nextState = { ...state, expenses: [expense, ...state.expenses] };
    if (!saveState(nextState)) {
      return;
    }

    state = nextState;
    render();
    expenseForm.reset();
    showStatus("Expense added.");
  });

  expenseList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-expense]");
    if (!button || !expenseList.contains(button)) {
      return;
    }

    const expenseId = button.dataset.deleteExpense;
    const nextExpenses = state.expenses.filter(
      (expense) => expense.id !== expenseId,
    );
    if (nextExpenses.length === state.expenses.length) {
      showStatus("That expense could not be found.", "error");
      return;
    }

    const nextState = { ...state, expenses: nextExpenses };
    if (!saveState(nextState)) {
      return;
    }

    state = nextState;
    render();
    showStatus("Expense deleted.");
  });

  render();

  function parseAmountInCents(value) {
    const amount = Number(value);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > Number.MAX_SAFE_INTEGER / 100
    ) {
      return null;
    }

    const cents = Math.round(amount * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function isValidStoredState(value) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Number.isSafeInteger(value.budgetCents) ||
      value.budgetCents < 0 ||
      !Array.isArray(value.expenses)
    ) {
      return false;
    }

    let totalSpentCents = 0;
    for (const expense of value.expenses) {
      if (
        expense === null ||
        typeof expense !== "object" ||
        typeof expense.id !== "string" ||
        expense.id.length === 0 ||
        typeof expense.name !== "string" ||
        expense.name.trim().length === 0 ||
        expense.name.length > 80 ||
        !Number.isSafeInteger(expense.amountCents) ||
        expense.amountCents <= 0 ||
        !CATEGORIES.includes(expense.category) ||
        !isValidDate(expense.date) ||
        expense.amountCents > Number.MAX_SAFE_INTEGER - totalSpentCents
      ) {
        return false;
      }

      totalSpentCents += expense.amountCents;
    }

    return true;
  }

  function readStoredState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) {
        return { budgetCents: 0, expenses: [] };
      }

      const parsed = JSON.parse(saved);
      if (!isValidStoredState(parsed)) {
        throw new Error("Saved tracker data has an invalid format.");
      }

      return parsed;
    } catch (error) {
      console.error("Could not load the saved expense tracker data.", error);
      showStatus(
        "Saved data could not be read. The tracker started with a blank state; saving new changes will replace invalid saved data.",
        "error",
      );
      return { budgetCents: 0, expenses: [] };
    }
  }

  function saveState(nextState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return true;
    } catch (error) {
      console.error("Could not save the expense tracker data.", error);
      showStatus(
        "Your change could not be saved in this browser. Check storage availability and try again.",
        "error",
      );
      return false;
    }
  }

  function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function render() {
    const totalSpentCents = state.expenses.reduce(
      (total, expense) => total + expense.amountCents,
      0,
    );

    budgetSummary.textContent = formatCurrency(state.budgetCents);
    spentSummary.textContent = formatCurrency(totalSpentCents);
    remainingSummary.textContent = formatCurrency(
      state.budgetCents - totalSpentCents,
    );
    expenseCount.textContent = `${state.expenses.length} ${
      state.expenses.length === 1 ? "expense" : "expenses"
    }`;
    expenseCount.setAttribute("aria-label", expenseCount.textContent);

    expenseList.replaceChildren();
    if (state.expenses.length === 0) {
      const row = document.createElement("tr");
      row.className = "empty-row";

      const cell = document.createElement("td");
      cell.colSpan = 5;

      const icon = document.createElement("span");
      icon.className = "empty-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "+";

      const title = document.createElement("strong");
      title.textContent = "No expenses yet";

      const description = document.createElement("span");
      description.textContent = "Add your first expense to see it here.";

      cell.append(icon, title, description);
      row.append(cell);
      expenseList.append(row);
      return;
    }

    state.expenses.forEach((expense) => {
      const row = document.createElement("tr");
      appendCell(row, expense.name);
      appendCell(row, expense.category);
      appendCell(row, formatDate(expense.date));

      const amountCell = document.createElement("td");
      amountCell.className = "amount-column";
      amountCell.textContent = formatCurrency(expense.amountCents);
      row.append(amountCell);

      const actionCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.dataset.deleteExpense = expense.id;
      deleteButton.setAttribute("aria-label", `Delete ${expense.name}`);
      deleteButton.textContent = "Delete";
      actionCell.append(deleteButton);
      row.append(actionCell);
      expenseList.append(row);
    });
  }

  function appendCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }

  function formatCurrency(cents) {
    return currencyFormatter.format(cents / 100);
  }

  function formatDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  function showStatus(message, type = "success") {
    statusMessage.textContent = message;
    statusMessage.dataset.type = type;
    statusMessage.hidden = false;
  }

  function clearStatus() {
    statusMessage.textContent = "";
    statusMessage.hidden = true;
    delete statusMessage.dataset.type;
  }
})();