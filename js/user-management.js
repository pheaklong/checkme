// ============================================
// USER MANAGEMENT SYSTEM - WITH RLS
// ============================================

class UserManagement {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.isInitialized = false;
        this.isUsingSupabase = false;
        this.roles = {
            ADMIN: 'admin',
            EDITOR: 'editor',
            TEACHER: 'teacher',
            STUDENT: 'student'
        };
        this.permissions = {
            admin: {
                create_user: true,
                delete_user: true,
                edit_user: true,
                view_all: true,
                manage_roles: true,
                manage_system: true,
                view_attendance: true,
                view_grades: true,
                manage_grades: true,
                manage_attendance: true,
                view_student_results: true,
                create_notification: true,
                assign_teacher_permissions: true
            },
            editor: {
                create_user: false,
                delete_user: false,
                edit_user: true,
                view_all: true,
                manage_roles: true,
                manage_system: false,
                view_attendance: true,
                view_grades: true,
                manage_grades: true,
                manage_attendance: true,
                view_student_results: true,
                create_notification: true,
                assign_teacher_permissions: true
            },
            teacher: {
                create_user: false,
                delete_user: false,
                edit_user: false,
                view_all: false,
                manage_roles: false,
                manage_system: false,
                view_attendance: true,
                view_grades: true,
                manage_grades: true,
                manage_attendance: true,
                view_student_results: true,
                create_notification: false,
                view_own_classes: true,
                take_attendance: true,
                enter_grades: true,
                assign_teacher_permissions: false
            },
            student: {
                create_user: false,
                delete_user: false,
                edit_user: false,
                view_all: false,
                manage_roles: false,
                manage_system: false,
                view_attendance: false,
                view_grades: false,
                manage_grades: false,
                manage_attendance: false,
                view_student_results: true,
                create_notification: false,
                view_own_results: true,
                request_certificate: true,
                receive_notifications: true,
                assign_teacher_permissions: false
            }
        };
        
        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔧 Initializing User Management with Supabase (RLS enabled)...');
        
        try {
            // Check if SupabaseConfig is available
            if (typeof SupabaseConfig === 'undefined') {
                console.error('❌ SupabaseConfig is not loaded!');
                return;
            }

            // Initialize Supabase
            const initResult = SupabaseConfig.init();
            if (!initResult) {
                console.error('❌ Supabase initialization failed');
                return;
            }
            
            // Check connection
            console.log('🔄 Checking Supabase connection...');
            const connected = await SupabaseConfig.checkConnection();
            
            if (!connected) {
                console.error('❌ Cannot connect to Supabase');
                return;
            }
            
            this.isUsingSupabase = true;
            console.log('✅ Connected to Supabase');
            
            // Load users from Supabase
            await this.loadUsersFromSupabase();
            
            // Load current user from session
            this.loadCurrentUser();
            
            this.isInitialized = true;
            console.log('✅ User Management initialized with Supabase (RLS enabled)');
            
            // Update UI
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
        }
    }

    // ============================================
    // LOAD USERS FROM SUPABASE
    // ============================================

    async loadUsersFromSupabase() {
        try {
            console.log('📋 Loading users from Supabase...');
            const users = await SupabaseConfig.getAllUsers();
            
            if (users && users.length > 0) {
                this.users = users;
                console.log(`✅ Loaded ${users.length} users from Supabase`);
            } else {
                console.log('No users found in Supabase. Please create admin user manually.');
                console.log('💡 Run this SQL in Supabase SQL Editor:');
                console.log(`
                    INSERT INTO users (id, username, password, email, full_name, role, status, permissions, created_at)
                    VALUES (
                        'admin_001',
                        'admin',
                        '2a9d2a8b3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c',
                        'admin@school.edu.kh',
                        'Administrator',
                        'admin',
                        'active',
                        '{"create_user": true, "delete_user": true, "edit_user": true, "view_all": true, "manage_roles": true, "manage_system": true, "view_attendance": true, "view_grades": true, "manage_grades": true, "manage_attendance": true, "view_student_results": true, "create_notification": true, "assign_teacher_permissions": true}',
                        NOW()
                    );
                `);
            }
        } catch (error) {
            console.error('❌ Error loading users from Supabase:', error);
            console.log('💡 Make sure RLS policies are created and user exists in Supabase.');
            throw error;
        }
    }

    // ============================================
    // HASH PASSWORD
    // ============================================

    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    // ============================================
    // LOAD CURRENT USER
    // ============================================

    loadCurrentUser() {
        const saved = sessionStorage.getItem('current_user');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
                // Verify user still exists
                const userData = this.users.find(u => u.id === this.currentUser.id);
                if (userData) {
                    const { password, ...userWithoutPassword } = userData;
                    this.currentUser = userWithoutPassword;
                } else {
                    this.currentUser = null;
                    sessionStorage.removeItem('current_user');
                }
            } catch (e) {
                this.currentUser = null;
            }
        }
    }

    // ============================================
    // AUTHENTICATION METHODS
    // ============================================

    async login(username, password) {
        console.log(`🔑 Login attempt for: ${username}`);
        
        // Wait for initialization if not done
        if (!this.isInitialized) {
            console.log('⏳ Waiting for initialization...');
            await this.init();
        }
        
        const hashedPassword = this.hashPassword(password);
        
        // Find user in loaded users
        let user = this.users.find(u => 
            u.username === username && 
            u.password === hashedPassword &&
            u.status === 'active'
        );

        // If not found, try to fetch from Supabase directly
        if (!user && this.isUsingSupabase) {
            try {
                console.log(`🔍 Looking for user in Supabase: ${username}`);
                const supabaseUser = await SupabaseConfig.getUserByUsername(username);
                if (supabaseUser && supabaseUser.password === hashedPassword && supabaseUser.status === 'active') {
                    user = supabaseUser;
                    // Update local cache
                    const existingIndex = this.users.findIndex(u => u.id === user.id);
                    if (existingIndex === -1) {
                        this.users.push(user);
                    } else {
                        this.users[existingIndex] = user;
                    }
                    console.log(`✅ User found in Supabase: ${username}`);
                } else {
                    console.log(`❌ User not found in Supabase or password mismatch: ${username}`);
                }
            } catch (error) {
                console.error('Error checking user in Supabase:', error);
                return { success: false, message: 'ប្រព័ន្ធមានបញ្ហា សូមព្យាយាមម្តងទៀត' };
            }
        }

        if (user) {
            console.log(`✅ Login successful for: ${username}`);
            
            // Update last login
            user.lastLogin = new Date().toISOString();
            
            try {
                await SupabaseConfig.updateLastLogin(user.id);
            } catch (e) {
                console.warn('Could not update last login in Supabase:', e);
            }
            
            // Set current user (without password)
            const { password: pwd, ...userWithoutPassword } = user;
            this.currentUser = userWithoutPassword;
            sessionStorage.setItem('current_user', JSON.stringify(userWithoutPassword));
            this.updateUI();
            
            return { success: true, user: userWithoutPassword };
        }

        console.log(`❌ Login failed for: ${username}`);
        return { success: false, message: 'ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' };
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('current_user');
        this.updateUI();
        return { success: true };
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // ============================================
    // PERMISSION CHECKING
    // ============================================

    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (this.currentUser.role === this.roles.ADMIN) return true;
        
        const user = this.users.find(u => u.id === this.currentUser.id);
        if (!user) return false;
        
        return user.permissions && user.permissions[permission] === true;
    }

    hasAnyPermission(permissions) {
        for (const perm of permissions) {
            if (this.hasPermission(perm)) return true;
        }
        return false;
    }

    // ============================================
    // USER MANAGEMENT METHODS
    // ============================================

    async createUser(userData) {
        if (!this.hasPermission('create_user')) {
            return { success: false, message: 'អ្នកមិនមានសិទ្ធិបង្កើតអ្នកប្រើប្រាស់ទេ' };
        }

        // Check if username already exists
        if (this.users.find(u => u.username === userData.username)) {
            return { success: false, message: 'ឈ្មោះអ្នកប្រើប្រាស់មានរួចហើយ' };
        }

        // Check if email already exists
        if (this.users.find(u => u.email === userData.email)) {
            return { success: false, message: 'អ៊ីមែលមានរួចហើយ' };
        }

        const id = crypto.randomUUID ? crypto.randomUUID() : `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newUser = {
            id: id,
            username: userData.username,
            password: this.hashPassword(userData.password),
            email: userData.email,
            fullName: userData.fullName,
            role: userData.role || this.roles.STUDENT,
            createdAt: new Date().toISOString(),
            status: 'active',
            permissions: this.permissions[userData.role] || this.permissions[this.roles.STUDENT],
            lastLogin: null,
            class: userData.class || null,
            studentId: userData.studentId || null,
            phone: userData.phone || null,
            parentName: userData.parentName || null,
            parentPhone: userData.parentPhone || null,
            address: userData.address || null
        };

        console.log(`👤 Creating user: ${userData.username}`);
        
        // Save to Supabase
        const result = await SupabaseConfig.createUser(newUser);
        if (!result.success) {
            return { success: false, message: 'មិនអាចរក្សាទុកអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ: ' + result.error };
        }

        // Update local cache
        this.users.push(newUser);
        
        const { password, ...userWithoutPassword } = newUser;
        console.log(`✅ User created: ${userData.username}`);
        return { success: true, user: userWithoutPassword };
    }

    async updateUser(userId, updates) {
        if (!this.hasPermission('edit_user')) {
            return { success: false, message: 'អ្នកមិនមានសិទ្ធិកែប្រែអ្នកប្រើប្រាស់ទេ' };
        }

        const index = this.users.findIndex(u => u.id === userId);
        if (index === -1) {
            return { success: false, message: 'រកមិនឃើញអ្នកប្រើប្រាស់' };
        }

        if (this.currentUser && this.currentUser.id === userId && this.currentUser.role !== this.roles.ADMIN) {
            return { success: false, message: 'អ្នកមិនអាចកែប្រែគណនីរបស់ខ្លួនឯងបានទេ' };
        }

        if (updates.role) {
            updates.permissions = this.permissions[updates.role] || this.permissions[this.roles.STUDENT];
        }

        if (updates.password) {
            updates.password = this.hashPassword(updates.password);
        }

        // Update in Supabase
        const updatedUser = { ...this.users[index], ...updates };
        console.log(`✏️ Updating user: ${updatedUser.username}`);
        
        const result = await SupabaseConfig.updateUser(userId, updatedUser);
        if (!result.success) {
            return { success: false, message: 'មិនអាចរក្សាទុកការកែប្រែក្នុងប្រព័ន្ធ: ' + result.error };
        }

        // Update local cache
        this.users[index] = updatedUser;

        if (this.currentUser && this.currentUser.id === userId) {
            const { password, ...userWithoutPassword } = updatedUser;
            this.currentUser = userWithoutPassword;
            sessionStorage.setItem('current_user', JSON.stringify(userWithoutPassword));
            this.updateUI();
        }

        console.log(`✅ User updated: ${updatedUser.username}`);
        return { success: true, user: updatedUser };
    }

    async deleteUser(userId) {
        if (!this.hasPermission('delete_user')) {
            return { success: false, message: 'អ្នកមិនមានសិទ្ធិលុបអ្នកប្រើប្រាស់ទេ' };
        }

        if (this.currentUser && this.currentUser.id === userId) {
            return { success: false, message: 'អ្នកមិនអាចលុបគណនីរបស់ខ្លួនឯងបានទេ' };
        }

        const adminCount = this.users.filter(u => u.role === this.roles.ADMIN).length;
        const userToDelete = this.users.find(u => u.id === userId);
        if (userToDelete && userToDelete.role === this.roles.ADMIN && adminCount <= 1) {
            return { success: false, message: 'មិនអាចលុប Admin ចុងក្រោយបានទេ' };
        }

        console.log(`🗑️ Deleting user: ${userToDelete?.username || userId}`);
        
        // Delete from Supabase
        const result = await SupabaseConfig.deleteUser(userId);
        if (!result.success) {
            return { success: false, message: 'មិនអាចលុបអ្នកប្រើប្រាស់ក្នុងប្រព័ន្ធ: ' + result.error };
        }

        // Update local cache
        this.users = this.users.filter(u => u.id !== userId);

        console.log(`✅ User deleted: ${userId}`);
        return { success: true };
    }

    getUsers(filters = {}) {
        if (!this.hasPermission('view_all')) {
            if (this.currentUser && this.currentUser.role === this.roles.STUDENT) {
                return this.users.filter(u => u.id === this.currentUser.id).map(({ password, ...user }) => user);
            }
            return [];
        }

        let filteredUsers = this.users;
        
        if (filters.role) {
            filteredUsers = filteredUsers.filter(u => u.role === filters.role);
        }
        if (filters.status) {
            filteredUsers = filteredUsers.filter(u => u.status === filters.status);
        }
        if (filters.class) {
            filteredUsers = filteredUsers.filter(u => u.class === filters.class);
        }
        if (filters.search) {
            const search = filters.search.toLowerCase();
            filteredUsers = filteredUsers.filter(u => 
                u.fullName.toLowerCase().includes(search) ||
                u.username.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search)
            );
        }

        return filteredUsers.map(({ password, ...user }) => user);
    }

    getUserById(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return null;
        
        if (!this.hasPermission('view_all') && this.currentUser.id !== userId) {
            return null;
        }
        
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // ============================================
    // TEACHER PERMISSION MANAGEMENT
    // ============================================

    async assignTeacherPermissions(teacherId, permissions) {
        if (!this.hasPermission('assign_teacher_permissions') && 
            !this.hasPermission('manage_roles')) {
            return { success: false, message: 'អ្នកមិនមានសិទ្ធិកំណត់សិទ្ធិគ្រូទេ' };
        }

        const teacher = this.users.find(u => u.id === teacherId);
        if (!teacher) {
            return { success: false, message: 'រកមិនឃើញគ្រូ' };
        }

        if (teacher.role !== this.roles.TEACHER) {
            return { success: false, message: 'អ្នកប្រើប្រាស់នេះមិនមែនជាគ្រូទេ' };
        }

        teacher.permissions = { ...teacher.permissions, ...permissions };
        
        // Update in Supabase
        const result = await SupabaseConfig.updateUserPermissions(teacherId, teacher.permissions);
        if (!result.success) {
            return { success: false, message: 'មិនអាចរក្សាទុកសិទ្ធិក្នុងប្រព័ន្ធ: ' + result.error };
        }

        return { success: true, user: teacher };
    }

    getTeacherPermissions(teacherId) {
        const teacher = this.users.find(u => u.id === teacherId);
        if (!teacher || teacher.role !== this.roles.TEACHER) {
            return null;
        }
        return teacher.permissions || this.permissions[this.roles.TEACHER];
    }

    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================

    async createNotification(title, message, type = 'info', userIds = null) {
        if (!this.hasPermission('create_notification')) {
            return { success: false, message: 'អ្នកមិនមានសិទ្ធិបង្កើតការជូនដំណឹងទេ' };
        }

        let userIdsStr = 'all';
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            userIdsStr = userIds.join(',');
        }

        const notification = {
            id: `notif_${Date.now()}`,
            title: title,
            message: message,
            type: type,
            createdAt: new Date().toISOString(),
            readBy: '',
            userIds: userIdsStr
        };

        const result = await SupabaseConfig.saveNotification(notification);
        if (!result.success) {
            return { success: false, message: 'មិនអាចរក្សាទុកការជូនដំណឹងក្នុងប្រព័ន្ធ: ' + result.error };
        }

        return { success: true, notification: notification };
    }

    async getNotifications(userId = null) {
        if (!userId) {
            userId = this.currentUser?.id;
        }
        if (!userId) return [];

        return await SupabaseConfig.getNotifications(userId);
    }

    async markNotificationRead(notificationId, userId = null) {
        if (!userId) {
            userId = this.currentUser?.id;
        }
        if (!userId) return;

        return await SupabaseConfig.markNotificationRead(notificationId, userId);
    }

    // ============================================
    // UI METHODS
    // ============================================

    updateUI() {
        console.log('🔄 Updating UI...');
        const nav = document.querySelector('.user-nav');
        if (!nav) {
            console.log('⚠️ .user-nav element not found');
            return;
        }

        if (this.currentUser) {
            const roleLabels = {
                admin: '👑 Admin',
                editor: '📝 Editor',
                teacher: '👨‍🏫 គ្រូ',
                student: '👨‍🎓 សិស្ស'
            };

            nav.innerHTML = `
                <span class="text-sm text-gray-600">${roleLabels[this.currentUser.role] || this.currentUser.role}</span>
                <span class="text-sm text-gray-600">${this.currentUser.fullName}</span>
                <button onclick="window.userManagement.logout()" class="text-red-600 hover:text-red-800 text-sm">ចាកចេញ</button>
            `;
            console.log('✅ UI updated for logged in user');
        } else {
            nav.innerHTML = `
                <button onclick="window.userManagement.showLogin()" class="text-indigo-600 hover:text-indigo-800 text-sm">ចូលប្រើប្រាស់</button>
            `;
            console.log('✅ UI updated for logged out user');
        }
    }

    showLogin() {
        window.location.href = 'login.html';
    }

    logout() {
        if (confirm('តើអ្នកប្រាកដជាចង់ចាកចេញមែនទេ?')) {
            this.logout();
            window.location.href = 'login.html';
        }
    }

    // ============================================
    // RENDER USER MANAGEMENT TABLE
    // ============================================

    renderUserManagement(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Container #${containerId} not found`);
            return;
        }

        if (!this.hasPermission('view_all')) {
            container.innerHTML = '<div class="text-center py-8 text-red-500">អ្នកមិនមានសិទ្ធិមើលទំព័រនេះទេ</div>';
            return;
        }

        const users = this.getUsers();

        container.innerHTML = `
            <div class="user-management">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">👥 គ្រប់គ្រងអ្នកប្រើប្រាស់</h3>
                    ${this.hasPermission('create_user') ? `
                        <button onclick="window.userManagement.showCreateUserForm()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                            + បង្កើតអ្នកប្រើប្រាស់
                        </button>
                    ` : ''}
                </div>

                <div class="mb-4 flex flex-wrap gap-2">
                    <input type="text" id="userSearch" placeholder="ស្វែងរក..." class="border rounded-lg px-3 py-1 text-sm flex-1 min-w-[150px]" oninput="window.userManagement.filterUsers()">
                    <select id="roleFilter" class="border rounded-lg px-3 py-1 text-sm" onchange="window.userManagement.filterUsers()">
                        <option value="">ទាំងអស់</option>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="teacher">គ្រូ</option>
                        <option value="student">សិស្ស</option>
                    </select>
                    <select id="statusFilter" class="border rounded-lg px-3 py-1 text-sm" onchange="window.userManagement.filterUsers()">
                        <option value="">ទាំងអស់</option>
                        <option value="active">សកម្ម</option>
                        <option value="inactive">អសកម្ម</option>
                    </select>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="px-3 py-2 text-left">ឈ្មោះ</th>
                                <th class="px-3 py-2 text-left">អ៊ីមែល</th>
                                <th class="px-3 py-2 text-left">តួនាទី</th>
                                <th class="px-3 py-2 text-left">ស្ថានភាព</th>
                                <th class="px-3 py-2 text-center">សកម្មភាព</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody">
                            ${users.map(user => this.renderUserRow(user)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderUserRow(user) {
        const roleLabels = {
            admin: '<span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Admin</span>',
            editor: '<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Editor</span>',
            teacher: '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">គ្រូ</span>',
            student: '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">សិស្ស</span>'
        };

        const statusLabels = {
            active: '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">សកម្ម</span>',
            inactive: '<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">អសកម្ម</span>'
        };

        const canEdit = this.hasPermission('edit_user');
        const canDelete = this.hasPermission('delete_user');
        const canManageRoles = this.hasPermission('manage_roles');

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-3 py-2 font-medium">${user.fullName}</td>
                <td class="px-3 py-2 text-gray-600">${user.email}</td>
                <td class="px-3 py-2">${roleLabels[user.role] || user.role}</td>
                <td class="px-3 py-2">${statusLabels[user.status] || user.status}</td>
                <td class="px-3 py-2 text-center">
                    ${canEdit ? `<button onclick="window.userManagement.editUser('${user.id}')" class="text-blue-600 hover:text-blue-800 mr-2">✏️</button>` : ''}
                    ${canDelete ? `<button onclick="window.userManagement.deleteUser('${user.id}')" class="text-red-600 hover:text-red-800">🗑️</button>` : ''}
                    ${canManageRoles && user.role === 'teacher' ? `<button onclick="window.userManagement.manageTeacherPermissions('${user.id}')" class="text-green-600 hover:text-green-800 ml-2">🔑</button>` : ''}
                </td>
            </tr>
        `;
    }

    filterUsers() {
        const search = document.getElementById('userSearch')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';

        const filtered = this.getUsers({
            search: search,
            role: role,
            status: status
        });

        const tbody = document.getElementById('userTableBody');
        if (tbody) {
            tbody.innerHTML = filtered.map(user => this.renderUserRow(user)).join('');
        }
    }

    // ============================================
    // CREATE USER FORM
    // ============================================

    showCreateUserForm() {
        if (!this.hasPermission('create_user')) {
            alert('អ្នកមិនមានសិទ្ធិបង្កើតអ្នកប្រើប្រាស់ទេ');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 class="text-xl font-bold text-gray-800 mb-4">➕ បង្កើតអ្នកប្រើប្រាស់ថ្មី</h3>
                <form id="createUserForm" onsubmit="window.userManagement.handleCreateUser(event)">
                    <!-- ... form fields ... -->
                    <div class="flex gap-2 mt-4">
                        <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">បង្កើត</button>
                        <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">បោះបង់</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Show/hide student fields based on role
        document.getElementById('newRole').addEventListener('change', function() {
            const show = this.value === 'student';
            document.getElementById('studentFields').style.display = show ? 'block' : 'none';
            document.getElementById('studentFields2').style.display = show ? 'block' : 'none';
        });
    }

    // ... (rest of methods remain the same)
}

// ============================================
// INITIALIZE USER MANAGEMENT
// ============================================

const userManagement = new UserManagement();
window.userManagement = userManagement;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready, updating UI...');
    if (userManagement && typeof userManagement.updateUI === 'function') {
        userManagement.updateUI();
    }
});

console.log('📦 user-management.js loaded');


// ============================================
// DEBUG: CHECK PASSWORD
// ============================================

// បន្ថែមកូដនេះក្នុង login() method មុនពេលប្រៀបធៀប password

async login(username, password) {
    console.log(`🔑 Login attempt for: ${username}`);
    
    if (!this.isInitialized) {
        console.log('⏳ Waiting for initialization...');
        await this.init();
    }
    
    const hashedPassword = this.hashPassword(password);
    console.log(`🔐 Password hash for "${password}": ${hashedPassword}`);
    
    // Show all users for debugging
    console.log('📋 All users in memory:', this.users.map(u => ({
        username: u.username,
        password_hash: u.password,
        role: u.role,
        status: u.status
    })));
    
    // Find user
    let user = this.users.find(u => 
        u.username === username && 
        u.password === hashedPassword &&
        u.status === 'active'
    );

    console.log(`🔍 User found in memory: ${user ? 'YES' : 'NO'}`);
    if (user) {
        console.log(`👤 User details:`, {
            username: user.username,
            role: user.role,
            status: user.status
        });
    }

    // ... rest of the code
}
