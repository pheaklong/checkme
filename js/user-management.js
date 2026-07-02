// ============================================
// USER MANAGEMENT SYSTEM - SUPABASE
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
        
        // Start initialization
        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔧 Initializing User Management with Supabase...');
        
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
            
            // Ensure admin exists
            await this.ensureAdminExists();
            
            // Load current user from session
            this.loadCurrentUser();
            
            this.isInitialized = true;
            console.log('✅ User Management initialized with Supabase');
            
            // Update UI
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
        }
    }

    // ============================================
    // ENSURE ADMIN EXISTS
    // ============================================

    async ensureAdminExists() {
        try {
            // Check if admin exists
            const adminExists = this.users.find(u => u.username === 'admin');
            
            if (!adminExists) {
                console.log('👤 Admin not found, creating default admin...');
                
                // Create admin user data
                const adminData = {
                    id: 'admin_001',
                    username: 'admin',
                    password: 'admin123',
                    fullName: 'Administrator',
                    email: 'admin@school.edu.kh',
                    role: this.roles.ADMIN,
                    class: null,
                    studentId: null,
                    phone: null,
                    parentName: null,
                    parentPhone: null,
                    address: null,
                    permissions: this.permissions.admin
                };
                
                // Hash password
                adminData.password = this.hashPassword(adminData.password);
                
                // Save to Supabase using the saveUser method
                const result = await SupabaseConfig.saveUser(adminData);
                
                if (result.success) {
                    console.log('✅ Admin user created successfully!');
                    console.log('📝 Username: admin');
                    console.log('📝 Password: admin123');
                    // Reload users
                    await this.loadUsersFromSupabase();
                } else {
                    console.error('❌ Failed to create admin:', result.error);
                }
            } else {
                console.log('✅ Admin user already exists');
            }
        } catch (error) {
            console.error('❌ Error ensuring admin exists:', error);
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
                console.log('⚠️ No users found in Supabase');
                this.users = [];
            }
        } catch (error) {
            console.error('❌ Error loading users from Supabase:', error);
            this.users = [];
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
        console.log(`🔐 Password hash: ${hashedPassword}`);
        
        // Debug: Show users in memory
        console.log('📋 Users in memory:', this.users.map(u => ({
            username: u.username,
            password_hash: u.password ? u.password.substring(0, 10) + '...' : 'null',
            role: u.role,
            status: u.status
        })));
        
        // Find user in loaded users
        let user = this.users.find(u => 
            u.username === username && 
            u.password === hashedPassword &&
            u.status === 'active'
        );

        console.log(`🔍 User found in memory: ${user ? 'YES' : 'NO'}`);
        
        // If not found, try to fetch from Supabase directly
        if (!user && this.isUsingSupabase) {
            try {
                console.log(`🔍 Looking for user in Supabase: ${username}`);
                const supabaseUser = await SupabaseConfig.getUserByUsername(username);
                if (supabaseUser) {
                    console.log(`✅ Found user in Supabase: ${username}`);
                    console.log(`🔐 Stored hash: ${supabaseUser.password}`);
                    console.log(`🔐 Calculated hash: ${hashedPassword}`);
                    
                    if (supabaseUser.password === hashedPassword && supabaseUser.status === 'active') {
                        user = supabaseUser;
                        // Update local cache
                        const existingIndex = this.users.findIndex(u => u.id === user.id);
                        if (existingIndex === -1) {
                            this.users.push(user);
                        } else {
                            this.users[existingIndex] = user;
                        }
                        console.log(`✅ User authenticated: ${username}`);
                    } else {
                        console.log(`❌ Password mismatch for user: ${username}`);
                        console.log(`   Stored: ${supabaseUser.password}`);
                        console.log(`   Calculated: ${hashedPassword}`);
                    }
                } else {
                    console.log(`❌ User not found in Supabase: ${username}`);
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
        const result = await SupabaseConfig.saveUser(newUser);
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
        
        const result = await SupabaseConfig.saveUser(updatedUser);
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
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">ឈ្មោះអ្នកប្រើប្រាស់ *</label>
                        <input type="text" id="newUsername" class="w-full border rounded-lg px-3 py-2" required>
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">ពាក្យសម្ងាត់ *</label>
                        <input type="password" id="newPassword" class="w-full border rounded-lg px-3 py-2" required minlength="6">
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">ឈ្មោះពេញ *</label>
                        <input type="text" id="newFullName" class="w-full border rounded-lg px-3 py-2" required>
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">អ៊ីមែល *</label>
                        <input type="email" id="newEmail" class="w-full border rounded-lg px-3 py-2" required>
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">តួនាទី *</label>
                        <select id="newRole" class="w-full border rounded-lg px-3 py-2" required>
                            <option value="student">សិស្ស</option>
                            <option value="teacher">គ្រូ</option>
                            ${this.hasPermission('manage_roles') ? `<option value="editor">Editor</option>` : ''}
                            ${this.currentUser && this.currentUser.role === this.roles.ADMIN ? `<option value="admin">Admin</option>` : ''}
                        </select>
                    </div>
                    <div class="mb-3" id="studentFields" style="display:none">
                        <label class="block text-sm font-medium text-gray-700">ថ្នាក់</label>
                        <input type="text" id="newClass" class="w-full border rounded-lg px-3 py-2" placeholder="ឧ. 12A">
                    </div>
                    <div class="mb-3" id="studentFields2" style="display:none">
                        <label class="block text-sm font-medium text-gray-700">លេខសម្គាល់សិស្ស</label>
                        <input type="text" id="newStudentId" class="w-full border rounded-lg px-3 py-2" placeholder="ឧ. STU001">
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">លេខទូរស័ព្ទ</label>
                        <input type="tel" id="newPhone" class="w-full border rounded-lg px-3 py-2">
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
                            បង្កើត
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">
                            បោះបង់
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('newRole').addEventListener('change', function() {
            const show = this.value === 'student';
            document.getElementById('studentFields').style.display = show ? 'block' : 'none';
            document.getElementById('studentFields2').style.display = show ? 'block' : 'none';
        });
    }

    async handleCreateUser(event) {
        event.preventDefault();
        
        const userData = {
            username: document.getElementById('newUsername').value,
            password: document.getElementById('newPassword').value,
            fullName: document.getElementById('newFullName').value,
            email: document.getElementById('newEmail').value,
            role: document.getElementById('newRole').value,
            class: document.getElementById('newClass').value || null,
            studentId: document.getElementById('newStudentId').value || null,
            phone: document.getElementById('newPhone').value || null
        };

        const result = await this.createUser(userData);
        if (result.success) {
            alert('✅ បានបង្កើតអ្នកប្រើប្រាស់ដោយជោគជ័យ!');
            document.querySelector('.fixed')?.remove();
            this.renderUserManagement('userManagementContainer');
        } else {
            alert('❌ ' + result.message);
        }
    }

    async editUser(userId) {
        const user = this.getUserById(userId);
        if (!user) {
            alert('រកមិនឃើញអ្នកប្រើប្រាស់');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h3 class="text-xl font-bold text-gray-800 mb-4">✏️ កែប្រែអ្នកប្រើប្រាស់</h3>
                <form id="editUserForm" onsubmit="window.userManagement.handleEditUser(event, '${userId}')">
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">ឈ្មោះពេញ</label>
                        <input type="text" id="editFullName" class="w-full border rounded-lg px-3 py-2" value="${user.fullName}" required>
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">អ៊ីមែល</label>
                        <input type="email" id="editEmail" class="w-full border rounded-lg px-3 py-2" value="${user.email}" required>
                    </div>
                    ${this.hasPermission('manage_roles') ? `
                        <div class="mb-3">
                            <label class="block text-sm font-medium text-gray-700">តួនាទី</label>
                            <select id="editRole" class="w-full border rounded-lg px-3 py-2">
                                <option value="student" ${user.role === 'student' ? 'selected' : ''}>សិស្ស</option>
                                <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>គ្រូ</option>
                                ${this.currentUser && this.currentUser.role === this.roles.ADMIN ? `
                                    <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>Editor</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                ` : ''}
                            </select>
                        </div>
                    ` : ''}
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">ស្ថានភាព</label>
                        <select id="editStatus" class="w-full border rounded-lg px-3 py-2">
                            <option value="active" ${user.status === 'active' ? 'selected' : ''}>សកម្ម</option>
                            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>អសកម្ម</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700">ពាក្យសម្ងាត់ថ្មី (ទុកចោលប្រសិនបើមិនចង់ប្តូរ)</label>
                        <input type="password" id="editPassword" class="w-full border rounded-lg px-3 py-2" placeholder="បញ្ចូលពាក្យសម្ងាត់ថ្មី">
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
                            រក្សាទុក
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">
                            បោះបង់
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async handleEditUser(event, userId) {
        event.preventDefault();
        
        const updates = {
            fullName: document.getElementById('editFullName').value,
            email: document.getElementById('editEmail').value,
            status: document.getElementById('editStatus').value
        };

        const roleSelect = document.getElementById('editRole');
        if (roleSelect) {
            updates.role = roleSelect.value;
        }

        const password = document.getElementById('editPassword').value;
        if (password) {
            updates.password = password;
        }

        const result = await this.updateUser(userId, updates);
        if (result.success) {
            alert('✅ បានកែប្រែអ្នកប្រើប្រាស់ដោយជោគជ័យ!');
            document.querySelector('.fixed')?.remove();
            this.renderUserManagement('userManagementContainer');
        } else {
            alert('❌ ' + result.message);
        }
    }

    async deleteUser(userId) {
        if (!confirm('តើអ្នកប្រាកដជាចង់លុបអ្នកប្រើប្រាស់នេះមែនទេ?')) return;

        const result = await this.deleteUser(userId);
        if (result.success) {
            alert('✅ បានលុបអ្នកប្រើប្រាស់ដោយជោគជ័យ!');
            this.renderUserManagement('userManagementContainer');
        } else {
            alert('❌ ' + result.message);
        }
    }

    async manageTeacherPermissions(teacherId) {
        const teacher = this.getUserById(teacherId);
        if (!teacher) {
            alert('រកមិនឃើញគ្រូ');
            return;
        }

        const permissions = this.getTeacherPermissions(teacherId) || this.permissions[this.roles.TEACHER];

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                <h3 class="text-xl font-bold text-gray-800 mb-4">🔑 កំណត់សិទ្ធិគ្រូ</h3>
                <p class="text-sm text-gray-500 mb-4">គ្រូ៖ <strong>${teacher.fullName}</strong></p>
                <form id="permissionForm" onsubmit="window.userManagement.handlePermissionUpdate(event, '${teacherId}')">
                    <div class="space-y-2 mb-4">
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="perm_attendance" ${permissions.take_attendance ? 'checked' : ''}>
                            <span>ស្រង់វត្តមាន</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="perm_grades" ${permissions.enter_grades ? 'checked' : ''}>
                            <span>បញ្ជូលពិន្ទុ</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="perm_results" ${permissions.view_student_results ? 'checked' : ''}>
                            <span>មើលលទ្ធផលសិស្ស</span>
                        </label>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" id="perm_manage" ${permissions.manage_grades ? 'checked' : ''}>
                            <span>គ្រប់គ្រងពិន្ទុ</span>
                        </label>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
                            រក្សាទុក
                        </button>
                        <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">
                            បោះបង់
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async handlePermissionUpdate(event, teacherId) {
        event.preventDefault();
        
        const permissions = {
            take_attendance: document.getElementById('perm_attendance').checked,
            enter_grades: document.getElementById('perm_grades').checked,
            view_student_results: document.getElementById('perm_results').checked,
            manage_grades: document.getElementById('perm_manage').checked
        };

        const result = await this.assignTeacherPermissions(teacherId, permissions);
        if (result.success) {
            alert('✅ បានកំណត់សិទ្ធិដោយជោគជ័យ!');
            document.querySelector('.fixed')?.remove();
            this.renderUserManagement('userManagementContainer');
        } else {
            alert('❌ ' + result.message);
        }
    }
}

// ============================================
// INITIALIZE USER MANAGEMENT
// ============================================

// Create instance and expose globally
const userManagement = new UserManagement();
window.userManagement = userManagement;

// Also expose to window for debugging
window.userManagement = userManagement;

// When DOM is ready, update UI
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready, updating UI...');
    if (userManagement && typeof userManagement.updateUI === 'function') {
        userManagement.updateUI();
    }
});

console.log('📦 user-management.js loaded');
