const loadExpenses = () => {
	try {
		const stored = localStorage.getItem('monthly_expense_tracker.expense.data');
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error('Error loading books from localStorage:', error);
		return [];
	}
};

const saveExpenses = () => {
	try {
		localStorage.setItem(
			'monthly_expense_tracker.expense.data',
			JSON.stringify(expenses)
		);
	} catch (error) {
		console.error('Error saving books to localStorage:', error);
	}
};

let expenses = loadExpenses(),
	editingId = null,
	monthlyBudget =
		localStorage.getItem('monthly_expense_tracker.monthly.budget') || 0;

// Tunggu sampai DOM selesai load
document.addEventListener('DOMContentLoaded', function () {
	const customMessages = {
		amount: 'Harap isi Jumlah pengeluaran',
		category: 'Harap isi kategori pengeluaran',
		date: 'Harap pilih tanggal transaksi',
		status: 'Harap pilih Status transaksi',
	};

	document.querySelectorAll('input[required]').forEach(input => {
		input.addEventListener('invalid', e => {
			const fieldName = e.target.name;
			e.target.setCustomValidity(
				customMessages[fieldName] || 'Field ini wajib diisi'
			);
		});

		input.addEventListener('input', e => {
			e.target.setCustomValidity('');
		});
	});

	document.querySelectorAll('select[required]').forEach(select => {
		select.addEventListener('invalid', e => {
			const fieldName = e.target.name,
				message = customMessages[fieldName] || 'Silakan pilih salah satu opsi';
			e.target.setCustomValidity(message);
		});

		select.addEventListener('change', e => {
			e.target.setCustomValidity('');
		});
	});

	// Set tanggal hari ini sebagai default
	const dateInput = document.querySelector('#date');
	if (dateInput) {
		const now = new Date(),
			formattedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
				.toISOString()
				.slice(0, 16);
		dateInput.value = formattedDate;
	}

	// Setup form event listener
	const form = document.querySelector('#expenseForm');
	if (form) {
		form.addEventListener('submit', handleFormSubmit);
	}

	// Cancel button event listener
	const cancelBtn = document.querySelector('#cancelBtn');
	if (cancelBtn) {
		cancelBtn.addEventListener('click', cancelEdit);
	}

	// Initial render
	updateBudgetDisplay();
	updateStats();
	renderExpenses();
});

// Handle form submission
function handleFormSubmit(e) {
	e.preventDefault(); // Mencegah form submission default

	const form = e.target,
		formData = new FormData(form);

	// Validasi manual
	const amount = parseFloat(formData.get('amount')),
		category = formData.get('category'),
		date = formData.get('date'),
		status = formData.get('status'),
		description = formData.get('description');

	// Cek validasi
	if (!amount || amount <= 0) {
		alert('Masukkan jumlah yang valid!');
		return;
	} else if (amount && !monthlyBudget) {
		alert('Tambahkan gaji/uang bulanan terlebih dahulu!');
		return;
	}

	if (!category) {
		alert('Pilih kategori!');
		return;
	}

	if (!date) {
		alert('Pilih tanggal transaksi!');
		return;
	}

	if (!status) {
		alert('Pilih status pembayaran!');
		return;
	}

	const expenseData = {
		amount: amount,
		category: category,
		date: date,
		status: status,
		description: description || '',
	};

	addExpense(expenseData);

	if (!editingId) {
		form.reset();
		// Reset tanggal ke sekarang
		const dateInput = document.querySelector('#date');
		if (dateInput) {
			const now = new Date();
			const formattedDate = new Date(
				now.getTime() - now.getTimezoneOffset() * 60000
			)
				.toISOString()
				.slice(0, 16);
			dateInput.value = formattedDate;
		}
	}

	return false; // Tambahan pencegahan
}

// Format currency
function formatCurrency(amount) {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 2,
	}).format(amount);
}

// Format date
function formatDate(dateString) {
	const options = {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	};
	return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Generate unique ID
function generateId() {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Set budget
function setBudget() {
	const budgetInput = document.querySelector('#monthlyBudget'),
		budgetValue = parseFloat(budgetInput.value);

	if (budgetValue && budgetValue > 0) {
		monthlyBudget = budgetValue;

		localStorage.setItem('monthly_expense_tracker.monthly.budget', budgetValue);
		updateBudgetDisplay();
		updateStats();
		budgetInput.value = '';
	} else {
		alert('Masukkan jumlah budget yang valid!');
	}
}

// Edit budget
function editBudget() {
	const budgetInput = document.querySelector('#monthlyBudget'),
		budgetDisplay = document.querySelector('#budgetDisplay'),
		inputGroup = document.querySelector('.budget-input-group');

	budgetInput.value = monthlyBudget;
	budgetDisplay.style.display = 'none';
	inputGroup.style.display = 'flex';
}

// Update budget display
function updateBudgetDisplay() {
	const budgetDisplay = document.querySelector('#budgetDisplay'),
		budgetAmount = budgetDisplay.querySelector('.budget-amount'),
		inputGroup = document.querySelector('.budget-input-group');

	if (monthlyBudget > 0) {
		budgetAmount.textContent = formatCurrency(monthlyBudget);
		budgetDisplay.style.display = 'flex';
		inputGroup.style.display = 'none';
	}
}

// Check budget status and show alerts
function checkBudgetStatus() {
	const total = expenses.reduce((sum, expense) => sum + expense.amount, 0),
		remaining = monthlyBudget - total,
		budgetAlert = document.querySelector('#budgetAlert'),
		remainingCard = document.querySelector('#remainingCard');

	// Reset classes
	remainingCard.className = 'stat-card';
	budgetAlert.style.display = 'none';
	budgetAlert.className = 'budget-alert';

	if (monthlyBudget > 0) {
		if (remaining < 0) {
			const deficit = Math.abs(remaining);

			if (deficit <= 100000) {
				// Orange warning (1k - 100k over budget)
				budgetAlert.className = 'budget-alert warning';
				budgetAlert.innerHTML = `
                    ⚠️ <strong>Peringatan!</strong><br>
                    Pengeluaran melebihi budget sebesar <strong>-${formatCurrency(
											deficit
										)}</strong><br>
                    Hati-hati dengan pengeluaran selanjutnya!
                `;
				remainingCard.className = 'stat-card over-budget-warning';
			} else {
				// Red warning (over 100k over budget)
				budgetAlert.className = 'budget-alert danger';
				budgetAlert.innerHTML = `
                    🚨 <strong>BAHAYA!</strong><br>
                    Pengeluaran jauh melebihi budget sebesar <strong>-${formatCurrency(
											deficit
										)}</strong><br>
                    Segera evaluasi keuangan Anda!
                `;
				remainingCard.className = 'stat-card over-budget-danger';
			}
			budgetAlert.style.display = 'block';
		}
	}
}

// Update statistics
function updateStats() {
	const total = expenses.reduce((sum, expense) => sum + expense.amount, 0),
		paid = expenses
			.filter(expense => expense.status === 'Lunas')
			.reduce((sum, expense) => sum + expense.amount, 0),
		unpaid = total - paid,
		remaining = monthlyBudget - total;

	document.querySelector('#totalExpenses').textContent = formatCurrency(total);
	document.querySelector('#paidExpenses').textContent = formatCurrency(paid);
	document.querySelector('#unpaidExpenses').textContent =
		formatCurrency(unpaid);
	document.querySelector('#remainingBudget').textContent =
		formatCurrency(remaining);

	checkBudgetStatus();
}

// Render expenses list
function renderExpenses() {
	const expensesList = document.querySelector('#expensesList');

	if (expenses.length === 0) {
		expensesList.innerHTML = `
            <div class="no-expenses">
                Belum ada pengeluaran yang tercatat.<br>
                Mulai tambahkan pengeluaran pertama Anda! 🚀
            </div>
        `;
		return;
	}

	// Sort expenses by date (newest first)
	const sortedExpenses = [...expenses].sort(
		(a, b) => new Date(b.date) - new Date(a.date)
	);

	expensesList.innerHTML = sortedExpenses
		.map(
			expense => `
                <div class="expense-card">
                    <div class="expense-header">
                        <div class="expense-amount">${formatCurrency(
													expense.amount
												)}</div>
                        <div class="expense-status ${
													expense.status === 'Lunas'
														? 'status-paid'
														: 'status-unpaid'
												}">
                            ${expense.status}
                        </div>
                    </div>
                    <div class="expense-details">
                        <div class="expense-detail">
                            <strong>Kategori:</strong> ${expense.category}
                        </div>
                        <div class="expense-detail">
                            <strong>Tanggal:</strong> ${formatDate(
															expense.date
														)}
                        </div>
                    </div>
                    ${
											expense.description
												? `
                        <div class="expense-detail" style="margin-bottom: 15px;">
                            <strong>Deskripsi:</strong> ${expense.description}
                        </div>
                    `
												: ''
										}
                    <div class="expense-actions">
                        <button class="btn btn-edit" onclick="editExpense('${
													expense.id
												}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-danger" onclick="deleteExpense('${
													expense.id
												}')">
                            🗑️ Hapus
                        </button>
                    </div>
                </div>
            `
		)
		.join('');
}

// Add or update expense
function addExpense(expenseData) {
	if (editingId) {
		// Update existing expense
		const index = expenses.findIndex(expense => expense.id === editingId);
		if (index !== -1) {
			expenses[index] = { ...expenseData, id: editingId };
		}
		editingId = null;
		document.querySelector('#submitBtn').textContent = 'Tambah Pengeluaran';
		document.querySelector('#cancelBtn').style.display = 'none';
	} else {
		// Add new expense
		expenses.push({
			...expenseData,
			id: generateId(),
		});
	}

	saveExpenses();
	updateStats();
	renderExpenses();
}

// Edit expense
function editExpense(id) {
	const expense = expenses.find(expense => expense.id === id);
	if (!expense) return;

	// Fill form with expense data
	document.querySelector('#amount').value = expense.amount;
	document.querySelector('#category').value = expense.category;
	document.querySelector('#date').value = expense.date;
	document.querySelector('#status').value = expense.status;
	document.querySelector('#description').value = expense.description || '';

	// Update UI for editing mode
	editingId = id;
	document.querySelector('#submitBtn').textContent = 'Update Pengeluaran';
	document.querySelector('#cancelBtn').style.display = 'inline-block';

	saveExpenses();
	// Scroll to form
	document
		.querySelector('.form-section')
		.scrollIntoView({ behavior: 'smooth' });
}

// Delete expense
function deleteExpense(id) {
	if (confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) {
		expenses = expenses.filter(expense => expense.id !== id);

		saveExpenses();
		updateStats();
		renderExpenses();
	}
}

// Cancel edit
function cancelEdit() {
	editingId = null;
	const form = document.querySelector('#expenseForm');
	form.reset();

	// Reset tanggal ke sekarang
	const dateInput = document.querySelector('#date');
	if (dateInput) {
		const now = new Date();
		const formattedDate = new Date(
			now.getTime() - now.getTimezoneOffset() * 60000
		)
			.toISOString()
			.slice(0, 16);
		dateInput.value = formattedDate;
	}

	document.querySelector('#submitBtn').textContent = 'Tambah Pengeluaran';
	document.querySelector('#cancelBtn').style.display = 'none';
}
