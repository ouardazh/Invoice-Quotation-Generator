
        // !-- JAVASCRIPT APPLICATION LOGIC --
        // State management
        let currentView = 'landing';
        let documentType = 'Quotation';
        let items = [];
        let currentUser = null;
        let isRegisterMode = false;
        let pendingView = null;
        let companyLogoBase64 = '';

        // Initialize App on Load
        window.addEventListener('DOMContentLoaded', () => {
            initTheme();
            checkAuthSession();
            loadDraft();
            lucide.createIcons();
            
            if (items.length === 0) {
                items = [
                    { id: 1, description: 'Web Design & Development', quantity: 2, unitPrice: 150 },
                    { id: 2, description: 'Cloud Hosting & SSL', quantity: 1, unitPrice: 200 }
                ];
            }
            
            renderItemsTable();
            updatePreview();
            
            const dateInput = document.getElementById('doc-date');
            if (dateInput && !dateInput.value) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
                updatePreview();
            }
        });

        // Logo Upload Handler
        function handleLogoUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    companyLogoBase64 = e.target.result;
                    document.getElementById('preview-logo-img').src = companyLogoBase64;
                    document.getElementById('preview-logo-wrapper').classList.remove('hidden');
                    document.getElementById('remove-logo-btn').classList.remove('hidden');
                    saveDraftAuto();
                };
                reader.readAsDataURL(file);
            }
        }

        function removeLogo() {
            companyLogoBase64 = '';
            document.getElementById('biz-logo-input').value = '';
            document.getElementById('preview-logo-img').src = '';
            document.getElementById('preview-logo-wrapper').classList.add('hidden');
            document.getElementById('remove-logo-btn').classList.add('hidden');
            saveDraftAuto();
        }

        // Auth Management Logic
        function checkAuthSession() {
            const saved = localStorage.getItem('docupro_current_user');
            if (saved) {
                try {
                    currentUser = JSON.parse(saved);
                } catch(e) {
                    currentUser = null;
                }
            }
            renderAuthUI();
        }

        function renderAuthUI() {
            const container = document.getElementById('user-auth-area');
            const mobileContainer = document.getElementById('mobile-auth-btn-container');
            
            if (currentUser) {
                container.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem; background-color: var(--bg-subtle); padding: 0.375rem 0.75rem; border-radius: 0.75rem; border: 1px solid var(--border-color);">
                        <div style="width: 1.75rem; height: 1.75rem; border-radius: 9999px; background-color: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem;">
                            ${(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
                        </div>
                        <span style="font-size: 0.75rem; font-weight: 600; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${currentUser.name || currentUser.email}</span>
                        <button onclick="logout()" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding: 0.125rem;" title="Logout">
                            <i data-lucide="log-out" style="width: 1rem; height: 1rem;"></i>
                        </button>
                    </div>
                `;
                mobileContainer.innerHTML = `
                    <button onclick="logout()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background-color: var(--red-bg); color: var(--red-text); border: none; padding: 0.625rem; border-radius: 0.75rem; font-weight: 600; cursor:pointer;">
                        <i data-lucide="log-out" style="width: 1rem; height: 1rem;"></i> Logout (${currentUser.name || currentUser.email})
                    </button>
                `;
            } else {
                container.innerHTML = `
                    <button onclick="openAuthModal(false)" style="background:none; border:none; font-size:0.875rem; font-weight:600; cursor:pointer; color:var(--text-main); padding: 0.5rem;">Sign In</button>
                    <button onclick="openAuthModal(true)" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Sign Up</button>
                `;
                mobileContainer.innerHTML = `
                    <button onclick="openAuthModal(false); toggleMobileMenu();" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.625rem;">
                        <i data-lucide="user" style="width: 1rem; height: 1rem;"></i> Sign In / Sign Up
                    </button>
                `;
            }
            lucide.createIcons();
        }

        function openAuthModal(register = false) {
            isRegisterMode = register;
            const modal = document.getElementById('auth-modal');
            const title = document.getElementById('auth-modal-title');
            const subtitle = document.getElementById('auth-modal-subtitle');
            const nameField = document.getElementById('auth-name-field');
            const submitBtn = document.getElementById('auth-submit-btn');
            const switchText = document.getElementById('auth-switch-text');
            const switchBtn = document.getElementById('auth-switch-btn');

            if (isRegisterMode) {
                title.innerText = "Create an Account";
                subtitle.innerText = "Sign up to start generating invoices and managing documents.";
                nameField.classList.remove('hidden');
                submitBtn.innerText = "Create Account";
                switchText.innerText = "Already have an account?";
                switchBtn.innerText = "Sign In";
            } else {
                title.innerText = "Welcome Back";
                subtitle.innerText = "Please sign in to access the generator and your saved history.";
                nameField.classList.add('hidden');
                submitBtn.innerText = "Sign In";
                switchText.innerText = "Don't have an account?";
                switchBtn.innerText = "Sign Up";
            }
            modal.classList.remove('hidden');
        }

        function closeAuthModal() {
            document.getElementById('auth-modal').classList.add('hidden');
            pendingView = null;
        }

        function toggleAuthMode() {
            openAuthModal(!isRegisterMode);
        }

        function handleAuthSubmit(e) {
            e.preventDefault();
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value.trim();
            const name = document.getElementById('auth-name').value.trim();

            if (!email || !password) return;

            let users = JSON.parse(localStorage.getItem('docupro_users') || '[]');

            if (isRegisterMode) {
                if (!name) {
                    showModal("Error", "Please enter your full name.");
                    return;
                }
                const existing = users.find(u => u.email === email);
                if (existing) {
                    showModal("Error", "An account with this email already exists.");
                    return;
                }
                const newUser = { id: 'USR-' + Date.now(), name, email, password };
                users.push(newUser);
                localStorage.setItem('docupro_users', JSON.stringify(users));
                currentUser = newUser;
                showToast("Account created successfully!");
            } else {
                const user = users.find(u => u.email === email && u.password === password);
                if (!user) {
                    showModal("Invalid Credentials", "Incorrect email or password. Please try again or sign up.");
                    return;
                }
                currentUser = user;
                showToast("Signed in successfully!");
            }

            localStorage.setItem('docupro_current_user', JSON.stringify(currentUser));
            renderAuthUI();
            closeAuthModal();

            if (pendingView) {
                switchView(pendingView);
                pendingView = null;
            }
        }

        function logout() {
            localStorage.removeItem('docupro_current_user');
            currentUser = null;
            renderAuthUI();
            switchView('landing');
            showToast("Logged out successfully.");
        }

        function checkAccessAndSwitch(viewName) {
            if (!currentUser && (viewName === 'generator' || viewName === 'history')) {
                pendingView = viewName;
                openAuthModal(false);
                return;
            }
            switchView(viewName);
        }

        // View Navigation Handler
        function switchView(viewName) {
            if (!currentUser && (viewName === 'generator' || viewName === 'history')) {
                checkAccessAndSwitch(viewName);
                return;
            }

            currentView = viewName;
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
            
            if (viewName === 'landing') {
                document.getElementById('view-landing').classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (viewName === 'generator') {
                document.getElementById('view-generator').classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (viewName === 'history') {
                document.getElementById('view-history').classList.remove('hidden');
                renderSavedDocumentsList();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            lucide.createIcons();
        }

        // Theme Toggle Handler
        function toggleTheme() {
            const html = document.documentElement;
            const sunIcon = document.getElementById('theme-icon-sun');
            const moonIcon = document.getElementById('theme-icon-moon');
            
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                html.classList.add('light');
                localStorage.setItem('docupro_theme', 'light');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                html.classList.remove('light');
                html.classList.add('dark');
                localStorage.setItem('docupro_theme', 'dark');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }

        function initTheme() {
            const savedTheme = localStorage.getItem('docupro_theme') || 'light';
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(savedTheme);
            
            const sunIcon = document.getElementById('theme-icon-sun');
            const moonIcon = document.getElementById('theme-icon-moon');
            if (savedTheme === 'dark') {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        }

        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            if (menu.classList.contains('hidden')) {
                menu.classList.remove('hidden');
            } else {
                menu.classList.add('hidden');
            }
        }

        // Document Type Selector (Quotation vs Invoice)
        function setDocumentType(type) {
            documentType = type;
            const qBtn = document.getElementById('type-quotation');
            const iBtn = document.getElementById('type-invoice');
            
            if (type === 'Quotation') {
                qBtn.style.backgroundColor = 'var(--primary)';
                qBtn.style.color = 'white';
                qBtn.style.boxShadow = 'var(--shadow-sm)';
                iBtn.style.backgroundColor = 'transparent';
                iBtn.style.color = 'var(--text-secondary)';
                iBtn.style.boxShadow = 'none';
                if (!document.getElementById('doc-number').value || document.getElementById('doc-number').value.startsWith('#INV')) {
                    document.getElementById('doc-number').value = '#QT-2026-001';
                }
            } else {
                iBtn.style.backgroundColor = 'var(--primary)';
                iBtn.style.color = 'white';
                iBtn.style.boxShadow = 'var(--shadow-sm)';
                qBtn.style.backgroundColor = 'transparent';
                qBtn.style.color = 'var(--text-secondary)';
                qBtn.style.boxShadow = 'none';
                if (!document.getElementById('doc-number').value || document.getElementById('doc-number').value.startsWith('#QT')) {
                    document.getElementById('doc-number').value = '#INV-2026-001';
                }
            }
            saveDraftAuto();
            updatePreview();
        }

        // Line Items Management
        function addItemRow() {
            items.push({
                id: Date.now(),
                description: '',
                quantity: 1,
                unitPrice: 0
            });
            renderItemsTable();
            saveDraftAuto();
            updatePreview();
        }

        function removeItemRow(id) {
            if (items.length <= 1) {
                showModal("Minimum Item Required", "Your document must contain at least one service or product line item.");
                return;
            }
            items = items.filter(item => item.id !== id);
            renderItemsTable();
            saveDraftAuto();
            updatePreview();
        }

        function updateItemField(id, field, value) {
            const item = items.find(i => i.id === id);
            if (item) {
                if (field === 'quantity' || field === 'unitPrice') {
                    item[field] = parseFloat(value) || 0;
                } else {
                    item[field] = value;
                }
            }
            renderItemsTable();
            saveDraftAuto();
            updatePreview();
        }

        function renderItemsTable() {
            const tbody = document.getElementById('items-table-body');
            tbody.innerHTML = '';

            items.forEach((item, index) => {
                const lineTotal = (item.quantity * item.unitPrice).toFixed(2);
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                tr.innerHTML = `
                    <td style="padding: 0.75rem 0.5rem; color: var(--text-muted); font-weight: 500;">${index + 1}</td>
                    <td style="padding: 0.75rem 0.5rem;">
                        <input type="text" value="${escapeHtml(item.description)}" placeholder="e.g. Web Development" oninput="updateItemField(${item.id}, 'description', this.value)" class="form-input" style="padding: 0.375rem 0.625rem; font-size: 0.875rem;">
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                        <input type="number" min="1" value="${item.quantity}" oninput="updateItemField(${item.id}, 'quantity', this.value)" class="form-input" style="padding: 0.375rem 0.625rem; font-size: 0.875rem;">
                    </td>
                    <td style="padding: 0.75rem 0.5rem;">
                        <input type="number" min="0" step="any" value="${item.unitPrice}" oninput="updateItemField(${item.id}, 'unitPrice', this.value)" class="form-input" style="padding: 0.375rem 0.625rem; font-size: 0.875rem;">
                    </td>
                    <td style="padding: 0.75rem 0.5rem; text-align: right; font-weight: 600; color: var(--text-main);">
                        ${lineTotal} MAD
                    </td>
                    <td style="padding: 0.75rem 0.5rem; text-align: center;">
                        <button type="button" onclick="removeItemRow(${item.id})" style="background:none; border:none; cursor:pointer; color:var(--red-text); padding: 0.375rem; border-radius: 0.375rem;" title="Remove Item">
                            <i data-lucide="trash-2" style="width: 1rem; height: 1rem;"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            lucide.createIcons();
            calculateTotals();
        }

        function calculateTotals() {
            let subtotal = 0;
            items.forEach(item => {
                const q = parseFloat(item.quantity) || 0;
                const p = parseFloat(item.unitPrice) || 0;
                if (q > 0 && p >= 0) {
                    subtotal += q * p;
                }
            });

            const discountPercent = parseFloat(document.getElementById('doc-discount').value) || 0;
            const discountAmount = (subtotal * discountPercent) / 100;
            const grandTotal = Math.max(0, subtotal - discountAmount);

            const formattedGrand = grandTotal.toFixed(2) + ' MAD';
            document.getElementById('quick-grand-total').innerText = formattedGrand;
            
            return {
                subtotal: subtotal.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                discountPercent: discountPercent,
                grandTotal: grandTotal.toFixed(2)
            };
        }

        // Live Document Preview Update
        function updatePreview() {
            const bizName = document.getElementById('biz-name').value || 'My Business Name';
            const bizAddress = document.getElementById('biz-address').value || 'Business Address';
            const bizEmail = document.getElementById('biz-email').value || 'contact@mybiz.com';
            const bizPhone = document.getElementById('biz-phone').value || '+212 600 123 456';

            const clientName = document.getElementById('client-name').value || 'Client Name';
            const clientAddress = document.getElementById('client-address').value || 'Client Address';
            const docDate = document.getElementById('doc-date').value || new Date().toISOString().split('T')[0];
            const docNumber = document.getElementById('doc-number').value || '#QT-2026-001';

            document.getElementById('preview-biz-name').innerText = bizName;
            document.getElementById('preview-biz-address').innerText = bizAddress;
            document.getElementById('preview-biz-contact').innerText = `${bizEmail} | ${bizPhone}`;

            document.getElementById('preview-doc-type-title').innerText = documentType;
            document.getElementById('preview-doc-number').innerText = docNumber;

            document.getElementById('preview-client-name').innerText = clientName;
            document.getElementById('preview-client-address').innerText = clientAddress;
            document.getElementById('preview-doc-date').innerText = docDate;
            document.getElementById('preview-signature-name').innerText = bizName;

            const previewTbody = document.getElementById('preview-items-body');
            previewTbody.innerHTML = '';

            items.forEach((item, index) => {
                const lineTotal = ((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2);
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #f1f5f9';
                tr.innerHTML = `
                    <td style="padding: 0.625rem 0.75rem; color: #94a3b8; font-weight: 500; text-align: center;">${index + 1}</td>
                    <td style="padding: 0.625rem 0.75rem; font-weight: 500; color: #0f172a;">${escapeHtml(item.description) || 'Service Description'}</td>
                    <td style="padding: 0.625rem 0.75rem; text-align: center; color: #334155;">${item.quantity}</td>
                    <td style="padding: 0.625rem 0.75rem; text-align: right; color: #334155;">${parseFloat(item.unitPrice).toFixed(2)} MAD</td>
                    <td style="padding: 0.625rem 0.75rem; text-align: right; font-weight: 600; color: #0f172a;">${lineTotal} MAD</td>
                `;
                previewTbody.appendChild(tr);
            });

            const totals = calculateTotals();
            document.getElementById('preview-subtotal').innerText = totals.subtotal + ' MAD';
            
            const discountRow = document.getElementById('preview-discount-row');
            if (totals.discountPercent > 0) {
                discountRow.style.display = 'flex';
                discountRow.classList.remove('hidden');
                document.getElementById('preview-discount-label').innerText = `Discount (${totals.discountPercent}%):`;
                document.getElementById('preview-discount-amount').innerText = `-${totals.discountAmount} MAD`;
            } else {
                discountRow.style.display = 'none';
                discountRow.classList.add('hidden');
            }

            document.getElementById('preview-grand-total').innerText = totals.grandTotal + ' MAD';
        }

        // Print Validation & Trigger
        function triggerPrintCheck() {
            const bizName = document.getElementById('biz-name').value.trim();
            const clientName = document.getElementById('client-name').value.trim();
            
            let hasEmptyDesc = false;
            items.forEach(item => {
                if (!item.description.trim() || item.quantity <= 0 || item.unitPrice < 0) {
                    hasEmptyDesc = true;
                }
            });

            if (!bizName || !clientName || items.length === 0 || hasEmptyDesc) {
                showModal("Incomplete Document", "Please ensure Business Name, Client Name, and all Item descriptions/quantities/prices are properly filled before printing.");
                return;
            }

            window.print();
        }

        // LocalStorage Draft Auto-Save
        function saveDraftAuto() {
            const formData = {
                documentType,
                bizName: document.getElementById('biz-name').value,
                bizAddress: document.getElementById('biz-address').value,
                bizEmail: document.getElementById('biz-email').value,
                bizPhone: document.getElementById('biz-phone').value,
                clientName: document.getElementById('client-name').value,
                clientAddress: document.getElementById('client-address').value,
                docDate: document.getElementById('doc-date').value,
                docNumber: document.getElementById('doc-number').value,
                docDiscount: document.getElementById('doc-discount').value,
                companyLogoBase64,
                items
            };

            localStorage.setItem('docupro_draft', JSON.stringify(formData));
            
            const indicator = document.getElementById('auto-save-indicator');
            indicator.style.opacity = '1';
        }

        function loadDraft() {
            const saved = localStorage.getItem('docupro_draft');
            if (!saved) return;

            try {
                const data = JSON.parse(saved);
                if (data.documentType) setDocumentType(data.documentType);
                if (data.bizName) document.getElementById('biz-name').value = data.bizName;
                if (data.bizAddress) document.getElementById('biz-address').value = data.bizAddress;
                if (data.bizEmail) document.getElementById('biz-email').value = data.bizEmail;
                if (data.bizPhone) document.getElementById('biz-phone').value = data.bizPhone;
                if (data.clientName) document.getElementById('client-name').value = data.clientName;
                if (data.clientAddress) document.getElementById('client-address').value = data.clientAddress;
                if (data.docDate) document.getElementById('doc-date').value = data.docDate;
                if (data.docNumber) document.getElementById('doc-number').value = data.docNumber;
                if (data.docDiscount) document.getElementById('doc-discount').value = data.docDiscount;
                if (data.companyLogoBase64) {
                    companyLogoBase64 = data.companyLogoBase64;
                    document.getElementById('preview-logo-img').src = companyLogoBase64;
                    document.getElementById('preview-logo-wrapper').classList.remove('hidden');
                    document.getElementById('remove-logo-btn').classList.remove('hidden');
                }
                if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                    items = data.items;
                }
            } catch (e) {
                console.error("Error loading draft", e);
            }
        }

        // Save Document to History ("My Documents")
        function saveDocumentHistory() {
            const bizName = document.getElementById('biz-name').value.trim();
            const clientName = document.getElementById('client-name').value.trim();

            if (!bizName || !clientName) {
                showModal("Missing Information", "Please enter at least the Business Name and Client Name to save this document.");
                return;
            }

            const docRecord = {
                id: 'DOC-' + Date.now(),
                userId: currentUser ? currentUser.id : 'guest',
                documentType,
                bizName,
                clientName,
                docNumber: document.getElementById('doc-number').value || '#DOC-001',
                docDate: document.getElementById('doc-date').value,
                grandTotal: calculateTotals().grandTotal,
                createdAt: new Date().toLocaleDateString(),
                formData: {
                    documentType,
                    bizName,
                    bizAddress: document.getElementById('biz-address').value,
                    bizEmail: document.getElementById('biz-email').value,
                    bizPhone: document.getElementById('biz-phone').value,
                    clientName,
                    clientAddress: document.getElementById('client-address').value,
                    docDate: document.getElementById('doc-date').value,
                    docNumber: document.getElementById('doc-number').value,
                    docDiscount: document.getElementById('doc-discount').value,
                    companyLogoBase64,
                    items
                }
            };

            let history = JSON.parse(localStorage.getItem('docupro_history') || '[]');
            history.unshift(docRecord);
            localStorage.setItem('docupro_history', JSON.stringify(history));

            showToast("Document saved successfully to My Documents!");
        }

        function renderSavedDocumentsList() {
            const container = document.getElementById('saved-docs-container');
            let history = JSON.parse(localStorage.getItem('docupro_history') || '[]');
            
            if (currentUser) {
                history = history.filter(d => d.userId === currentUser.id || !d.userId);
            }

            if (history.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;" class="card">
                        <div style="width: 3rem; height: 3rem; background-color: var(--primary-light); color: var(--primary); border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto;">
                            <i data-lucide="folder-open" style="width: 1.5rem; height: 1.5rem;"></i>
                        </div>
                        <h3 style="font-weight: 700; font-size: 1.125rem;">No saved documents yet</h3>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">Create and save quotations or invoices to see them here.</p>
                        <button onclick="switchView('generator')" class="btn-primary" style="margin-top: 1rem; padding: 0.625rem 1.25rem;">Create Document</button>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            container.innerHTML = '';
            history.forEach(doc => {
                const card = document.createElement('div');
                card.className = "card";
                card.style.cssText = "padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;";
                card.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="padding: 0.25rem 0.625rem; background-color: var(--primary-light); color: var(--primary); font-weight: 700; font-size: 0.75rem; border-radius: 0.375rem; text-transform: uppercase;">${doc.documentType}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${doc.docNumber}</span>
                        </div>
                        <h3 style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${escapeHtml(doc.clientName)}</h3>
                        <p style="font-size: 0.75rem; color: var(--text-secondary);">Date: ${doc.docDate}</p>
                    </div>
                    <div style="padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 700; color: var(--primary); font-size: 1rem;">${doc.grandTotal} MAD</span>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button onclick="loadDocumentRecord('${doc.id}')" style="background-color: var(--primary-light); color: var(--primary-text); border: none; padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; cursor: pointer;">Open</button>
                            <button onclick="deleteDocumentRecord('${doc.id}')" style="background: none; border: none; color: var(--red-text); cursor: pointer; padding: 0.375rem; border-radius: 0.375rem;" title="Delete">
                                <i data-lucide="trash-2" style="width: 1rem; height: 1rem;"></i>
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            lucide.createIcons();
        }

        function loadDocumentRecord(id) {
            let history = JSON.parse(localStorage.getItem('docupro_history') || '[]');
            const doc = history.find(d => d.id === id);
            if (!doc || !doc.formData) return;

            const data = doc.formData;
            setDocumentType(data.documentType || 'Quotation');
            document.getElementById('biz-name').value = data.bizName || '';
            document.getElementById('biz-address').value = data.bizAddress || '';
            document.getElementById('biz-email').value = data.bizEmail || '';
            document.getElementById('biz-phone').value = data.bizPhone || '';
            document.getElementById('client-name').value = data.clientName || '';
            document.getElementById('client-address').value = data.clientAddress || '';
            document.getElementById('doc-date').value = data.docDate || new Date().toISOString().split('T')[0];
            document.getElementById('doc-number').value = data.docNumber || '';
            document.getElementById('doc-discount').value = data.docDiscount || 0;
            
            if (data.companyLogoBase64) {
                companyLogoBase64 = data.companyLogoBase64;
                document.getElementById('preview-logo-img').src = companyLogoBase64;
                document.getElementById('preview-logo-wrapper').classList.remove('hidden');
                document.getElementById('remove-logo-btn').classList.remove('hidden');
            } else {
                removeLogo();
            }

            if (data.items) {
                items = data.items;
            }

            renderItemsTable();
            updatePreview();
            switchView('generator');
            showToast("Document loaded into editor!");
        }

        function deleteDocumentRecord(id) {
            let history = JSON.parse(localStorage.getItem('docupro_history') || '[]');
            history = history.filter(d => d.id !== id);
            localStorage.setItem('docupro_history', JSON.stringify(history));
            renderSavedDocumentsList();
            showToast("Document deleted successfully.");
        }

        function clearForm() {
            document.getElementById('doc-form').reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('doc-date').value = today;
            document.getElementById('doc-number').value = '#QT-2026-001';
            document.getElementById('doc-discount').value = 0;
            removeLogo();
            items = [
                { id: Date.now(), description: '', quantity: 1, unitPrice: 0 }
            ];
            renderItemsTable();
            updatePreview();
            saveDraftAuto();
            showToast("Form cleared successfully.");
        }

        // Custom Modal Utilities
        function showModal(title, message) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-message').innerText = message;
            document.getElementById('custom-modal').classList.remove('hidden');
            lucide.createIcons();
        }

        function closeModal() {
            document.getElementById('custom-modal').classList.add('hidden');
        }

        // Toast Notification Helper
        function showToast(message) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.style.cssText = "background-color: #0f172a; color: white; padding: 0.75rem 1rem; border-radius: 0.75rem; box-shadow: var(--shadow-xl); display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; border: 1px solid #334155; pointer-events: auto;";
            toast.innerHTML = `
                <i data-lucide="check-circle-2" style="width: 1rem; height: 1rem; color: #34d399; flex-shrink: 0;"></i>
                <span>${message}</span>
            `;
            container.appendChild(toast);
            lucide.createIcons();

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // HTML Escape Helper
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }
   

        function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');

    if (!menu) return;

    menu.classList.toggle('hidden');
}