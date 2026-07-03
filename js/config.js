// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SupabaseConfig = {
    // Supabase credentials
    supabaseUrl: 'https://iziunkyxzfbhayrqwvvs.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aXVua3l4emZiaGF5cnF3dnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzI2NDgsImV4cCI6MjA5ODU0ODY0OH0.tpmY_oSgrQ1LPcPMy9_Ls-ZVl2HyMDgwHZR34gmzTtM',
    supabase: null,
    isInitialized: false,

    tables: {
        users: 'users',
        attendance: 'attendance',
        grades: 'grades',
        students: 'students',
        classes: 'classes',
        notifications: 'notifications',
        certificates: 'certificates',
        schedule: 'schedule'
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        if (this.isInitialized) return true;
        
        try {
            if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
                console.error('❌ Supabase library not loaded!');
                this.isInitialized = true;
                return false;
            }

            this.supabase = supabase.createClient(
                this.supabaseUrl,
                this.supabaseKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },
                    global: {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    }
                }
            );
            
            this.isInitialized = true;
            console.log('✅ Supabase client initialized');
            return true;
        } catch (error) {
            console.error('❌ Supabase initialization error:', error);
            this.isInitialized = true;
            return false;
        }
    },

    // ============================================
    // CONNECTION CHECK
    // ============================================

    async checkConnection() {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                console.error('❌ Supabase client not initialized');
                return false;
            }
            
            console.log('🔍 Checking Supabase connection...');
            
            const { data, error } = await this.supabase
                .from(this.tables.users)
                .select('count')
                .limit(1);
            
            if (error) {
                console.error('❌ Connection error:', error);
                return false;
            }
            
            console.log('✅ Supabase connection successful');
            return true;
        } catch (error) {
            console.error('❌ Connection error:', error);
            return false;
        }
    },

    // ============================================
    // USER MANAGEMENT FUNCTIONS
    // ============================================

    async saveUser(user) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`📝 Saving user: ${user.username}`);
            
            const { data: existing, error: checkError } = await this.supabase
                .from(this.tables.users)
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            let result;
            if (existing) {
                console.log(`🔄 Updating user: ${user.username}`);
                const { data, error } = await this.supabase
                    .from(this.tables.users)
                    .update({
                        username: user.username,
                        email: user.email,
                        full_name: user.fullName,
                        role: user.role,
                        status: user.status || 'active',
                        permissions: user.permissions || {},
                        class: user.class || null,
                        student_id: user.studentId || null,
                        phone: user.phone || null,
                        parent_name: user.parentName || null,
                        parent_phone: user.parentPhone || null,
                        address: user.address || null,
                        last_login: user.lastLogin || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id)
                    .select();
                
                if (error) throw error;
                result = { data, error: null };
            } else {
                console.log(`➕ Inserting user: ${user.username}`);
                const { data, error } = await this.supabase
                    .from(this.tables.users)
                    .insert({
                        id: user.id,
                        username: user.username,
                        password: user.password,
                        email: user.email,
                        full_name: user.fullName,
                        role: user.role,
                        status: user.status || 'active',
                        permissions: user.permissions || {},
                        class: user.class || null,
                        student_id: user.studentId || null,
                        phone: user.phone || null,
                        parent_name: user.parentName || null,
                        parent_phone: user.parentPhone || null,
                        address: user.address || null,
                        created_at: user.createdAt || new Date().toISOString(),
                        last_login: user.lastLogin || null
                    })
                    .select();
                
                if (error) throw error;
                result = { data, error: null };
            }

            if (result.error) {
                console.error('❌ Supabase error:', result.error);
                throw result.error;
            }
            
            console.log(`✅ User saved: ${user.username}`);
            return { success: true, data: result.data };
        } catch (error) {
            console.error('❌ Error saving user:', error);
            return { success: false, error: error.message };
        }
    },

    async getAllUsers() {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📋 Fetching all users...');
            
            const { data, error } = await this.supabase
                .from(this.tables.users)
                .select('*')
                .order('full_name', { ascending: true });

            if (error) {
                console.error('❌ Error fetching users:', error);
                return [];
            }
            
            if (!data || data.length === 0) {
                console.log('📭 No users found');
                return [];
            }

            console.log(`✅ Fetched ${data.length} users`);
            return data.map(user => ({
                id: user.id,
                username: user.username,
                password: user.password,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                status: user.status,
                permissions: user.permissions || {},
                class: user.class,
                studentId: user.student_id,
                phone: user.phone,
                parentName: user.parent_name,
                parentPhone: user.parent_phone,
                address: user.address,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }));
        } catch (error) {
            console.error('❌ Error fetching users:', error);
            return [];
        }
    },

    async getUserByUsername(username) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`🔍 Fetching user by username: ${username}`);
            
            const { data, error } = await this.supabase
                .from(this.tables.users)
                .select('*')
                .eq('username', username)
                .maybeSingle();

            if (error) {
                console.error('❌ Error fetching user:', error);
                return null;
            }
            
            if (!data) {
                console.log(`📭 User not found: ${username}`);
                return null;
            }

            console.log(`✅ Found user: ${username}`);
            
            return {
                id: data.id,
                username: data.username,
                password: data.password,
                email: data.email,
                fullName: data.full_name,
                role: data.role,
                status: data.status,
                permissions: data.permissions || {},
                class: data.class,
                studentId: data.student_id,
                phone: data.phone,
                parentName: data.parent_name,
                parentPhone: data.parent_phone,
                address: data.address,
                createdAt: data.created_at,
                lastLogin: data.last_login
            };
        } catch (error) {
            console.error('❌ Error fetching user by username:', error);
            return null;
        }
    },

    async deleteUser(userId) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`🗑️ Deleting user: ${userId}`);
            
            const { error } = await this.supabase
                .from(this.tables.users)
                .delete()
                .eq('id', userId);

            if (error) {
                console.error('❌ Error deleting user:', error);
                throw error;
            }
            
            console.log(`✅ User deleted: ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUserPermissions(userId, permissions) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`🔑 Updating permissions for user: ${userId}`);
            
            const { error } = await this.supabase
                .from(this.tables.users)
                .update({
                    permissions: permissions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('❌ Error updating permissions:', error);
                throw error;
            }
            
            console.log(`✅ Permissions updated for user: ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating permissions:', error);
            return { success: false, error: error.message };
        }
    },

    async updateLastLogin(userId) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase
                .from(this.tables.users)
                .update({
                    last_login: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('❌ Error updating last login:', error);
                throw error;
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating last login:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // NOTIFICATION FUNCTIONS
    // ============================================

    async saveNotification(notification) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`📝 Saving notification: ${notification.title}`);
            
            const { error } = await this.supabase
                .from(this.tables.notifications)
                .insert({
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type || 'info',
                    user_ids: notification.userIds || 'all',
                    read_by: notification.readBy || '',
                    created_at: notification.createdAt || new Date().toISOString()
                });

            if (error) {
                console.error('❌ Error saving notification:', error);
                throw error;
            }
            
            console.log(`✅ Notification saved: ${notification.title}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error saving notification:', error);
            return { success: false, error: error.message };
        }
    },

    async getNotifications(userId) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabase
                .from(this.tables.notifications)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching notifications:', error);
                return [];
            }

            if (!data || data.length === 0) return [];

            return data.filter(n => {
                if (n.user_ids === 'all') return true;
                if (!n.user_ids) return false;
                const userIdsList = n.user_ids.split(',');
                return userIdsList.includes(userId);
            });
        } catch (error) {
            console.error('❌ Error fetching notifications:', error);
            return [];
        }
    },

    async markNotificationRead(notificationId, userId) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabase
                .from(this.tables.notifications)
                .select('read_by')
                .eq('id', notificationId)
                .single();

            if (error) {
                console.error('❌ Error fetching notification:', error);
                throw error;
            }

            let readBy = data.read_by || '';
            const readList = readBy ? readBy.split(',') : [];
            if (!readList.includes(userId)) {
                readList.push(userId);
                readBy = readList.join(',');
            }

            const { error: updateError } = await this.supabase
                .from(this.tables.notifications)
                .update({ read_by: readBy })
                .eq('id', notificationId);

            if (updateError) {
                console.error('❌ Error marking notification as read:', updateError);
                throw updateError;
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // ATTENDANCE FUNCTIONS
    // ============================================

    async fetchAttendance(classVal, semester, date) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            let query = this.supabase
                .from(this.tables.attendance)
                .select('*')
                .eq('class', classVal);

            if (semester) {
                query = query.eq('semester', parseInt(semester));
            }
            if (date) {
                query = query.eq('date', date);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Error fetching attendance:', error);
            return [];
        }
    },

    async saveAttendanceToSupabase(records) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            if (records.length === 0) return true;

            const first = records[0];
            await this.supabase
                .from(this.tables.attendance)
                .delete()
                .eq('class', first.class)
                .eq('subject', first.subject)
                .eq('date', first.date)
                .eq('time_slot', first.time_slot);

            for (const record of records) {
                const { error } = await this.supabase
                    .from(this.tables.attendance)
                    .insert({
                        class: record.class,
                        subject: record.subject,
                        time_slot: record.time_slot,
                        semester: record.semester,
                        date: record.date,
                        student_id: record.student_id,
                        status: record.status,
                        auto_assigned: record.auto_assigned || false,
                        teacher_set: record.teacher_set || false,
                        auto_submitted: record.auto_submitted || false,
                        not_scheduled: record.not_scheduled || false,
                        created_at: record.created_at || new Date().toISOString()
                    });

                if (error) throw error;
            }

            return true;
        } catch (error) {
            console.error('❌ Error saving attendance:', error);
            return false;
        }
    },

    // ============================================
    // STUDENT FUNCTIONS - FIXED
    // ============================================

    async fetchStudentsByClass(classVal) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`📋 Fetching students for class: ${classVal}`);
            
            const { data, error } = await this.supabase
                .from(this.tables.students)
                .select('*')
                .eq('class', classVal)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching students:', error);
                return [];
            }

            if (data && data.length > 0) {
                return data.map(s => ({
                    studentID: s.student_id || s.id,
                    name: s.name,
                    class: s.class,
                    sex: s.sex || 'N/A',
                    photo: s.photo || null,
                    phone: s.phone || null,
                    parentName: s.parent_name || null,
                    parentPhone: s.parent_phone || null,
                    address: s.address || null,
                    fatherName: s.father_name || null,
                    fatherPhone: s.father_phone || null,
                    fatherJob: s.father_job || null,
                    motherName: s.mother_name || null,
                    motherPhone: s.mother_phone || null,
                    motherJob: s.mother_job || null
                }));
            }

            // If no students in students table, try from users table
            const { data: userData, error: userError } = await this.supabase
                .from(this.tables.users)
                .select('*')
                .eq('role', 'student')
                .eq('class', classVal)
                .eq('status', 'active')
                .order('full_name', { ascending: true });

            if (userError) {
                console.error('Error fetching students from users:', userError);
                return [];
            }

            if (userData && userData.length > 0) {
                return userData.map(s => ({
                    studentID: s.student_id || s.id,
                    name: s.full_name,
                    class: s.class,
                    sex: 'N/A',
                    photo: null,
                    phone: s.phone || null,
                    parentName: s.parent_name || null,
                    parentPhone: s.parent_phone || null,
                    address: s.address || null,
                    fatherName: null,
                    fatherPhone: null,
                    fatherJob: null,
                    motherName: null,
                    motherPhone: null,
                    motherJob: null
                }));
            }

            console.log(`📭 No students found for class: ${classVal}`);
            return [];
        } catch (error) {
            console.error('❌ Error fetching students:', error);
            return [];
        }
    },

    async fetchAllClasses() {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log('📋 Fetching all classes from students table...');

            // Get distinct classes from students table
            const { data, error } = await this.supabase
                .from(this.tables.students)
                .select('class')
                .not('class', 'is', null)
                .neq('class', '')
                .order('class');

            if (error) {
                console.error('Error fetching classes from students:', error);
                return this.getDefaultClasses();
            }

            if (data && data.length > 0) {
                const classes = [...new Set(data.map(s => s.class).filter(Boolean))];
                console.log(`✅ Found ${classes.length} classes from students table:`, classes);
                
                if (classes.length > 0) {
                    return classes.sort();
                }
            }

            // If no classes in students, try from users table
            console.log('No classes found in students table, trying users table...');
            const { data: userData, error: userError } = await this.supabase
                .from(this.tables.users)
                .select('class')
                .eq('role', 'student')
                .not('class', 'is', null)
                .neq('class', '')
                .order('class');

            if (userError) {
                console.error('Error fetching classes from users:', userError);
                return this.getDefaultClasses();
            }

            if (userData && userData.length > 0) {
                const classes = [...new Set(userData.map(s => s.class).filter(Boolean))];
                console.log(`✅ Found ${classes.length} classes from users table:`, classes);
                if (classes.length > 0) {
                    return classes.sort();
                }
            }

            console.log('⚠️ No classes found in database, using default classes');
            return this.getDefaultClasses();

        } catch (error) {
            console.error('❌ Error fetching classes:', error);
            return this.getDefaultClasses();
        }
    },

    getDefaultClasses() {
        // Complete list of default classes
        const defaultClasses = [
            '7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H',
            '8A', '8B', '8C', '8D', '8E', '8F', '8G',
            '9A', '9B', '9C', '9D', '9E',
            '10A', '10B', '10C', '10D', '10E', '10F', '10G', '10H', '10I',
            '11A', '11B', '11C', '11D', '11E', '11F', '11G',
            '12A', '12B', '12C', '12D', '12E', '12F'
        ];
        console.log('⚠️ Using default classes list:', defaultClasses);
        return defaultClasses;
    },

    // ============================================
    // SCHEDULE FUNCTIONS
    // ============================================

    async saveTeacherSchedule(scheduleData) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            console.log(`📝 Saving teacher schedule for: ${scheduleData.teacher_id}`);

            // Delete existing schedule for this teacher
            await this.supabase
                .from(this.tables.schedule)
                .delete()
                .eq('teacher_id', scheduleData.teacher_id);

            // Insert new schedule
            if (scheduleData.entries && scheduleData.entries.length > 0) {
                const { error } = await this.supabase
                    .from(this.tables.schedule)
                    .insert(scheduleData.entries);

                if (error) {
                    console.error('Error saving schedule:', error);
                    throw error;
                }
            }

            console.log('✅ Teacher schedule saved successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ Error saving teacher schedule:', error);
            return { success: false, error: error.message };
        }
    },

    // ============================================
    // CERTIFICATE FUNCTIONS
    // ============================================

    async requestCertificate(studentId, type, details) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase
                .from(this.tables.certificates)
                .insert({
                    student_id: studentId,
                    type: type,
                    details: details || {},
                    status: 'pending',
                    requested_at: new Date().toISOString()
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Error requesting certificate:', error);
            return { success: false, error: error.message };
        }
    },

    async getCertificates(studentId) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data, error } = await this.supabase
                .from(this.tables.certificates)
                .select('*')
                .eq('student_id', studentId)
                .order('requested_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Error fetching certificates:', error);
            return [];
        }
    },

    async updateCertificateStatus(certificateId, status) {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            if (!this.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { error } = await this.supabase
                .from(this.tables.certificates)
                .update({
                    status: status,
                    updated_at: new Date().toISOString(),
                    completed_at: status === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', certificateId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating certificate:', error);
            return { success: false, error: error.message };
        }
    }
};

// ============================================
// AUTO-INITIALIZE
// ============================================

console.log('🚀 Initializing Supabase config...');
SupabaseConfig.init();

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM ready, ensuring Supabase is initialized...');
        SupabaseConfig.init();
    });
}

window.SupabaseConfig = SupabaseConfig;
console.log('📦 SupabaseConfig loaded');
