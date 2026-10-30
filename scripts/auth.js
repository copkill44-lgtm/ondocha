// Email/password authentication and per-user cloud synchronization.
const SUPABASE_URL = ONDOCHA_CONFIG.supabaseUrl;
const SUPABASE_PUBLISHABLE_KEY = ONDOCHA_CONFIG.supabasePublishableKey;
const CLOUD_DATA_KEYS = ["ootd-events", "codini-character", "feel-level", "custom-clothing-types", "custom-top-types", "custom-accessory-types", "clothing-preferences", "weather-city", "codini-account-tour-seen"];
let supabaseClient = null,
    currentAuthUser = null,
    cloudSaveTimer = null;
let suspendCloudSync = false,
    authDataReady = false,
    processingAuthId = null,
    authSyncPromise = null;
let authInitializationError = '';

function setAccountUi(user) {
    const button = document.getElementById('accountButton');
    const label = document.getElementById('accountLabel');
    if (button) button.textContent = user ? '로그아웃' : '이메일 로그인';
    if (label) {
        label.hidden = !user;
        label.textContent = user?.email || '';
    }
}

function localAppData() {
    const data = {};
    CLOUD_DATA_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) data[key] = value;
    });
    return data;
}

async function saveCloudState() {
    if (!supabaseClient || !currentAuthUser || !authDataReady || suspendCloudSync) return;
    const {
        error
    } = await supabaseClient.from('user_app_data').upsert({
        user_id: currentAuthUser.id,
        data: localAppData(),
        updated_at: new Date().toISOString()
    }, {
        onConflict: 'user_id'
    });
    if (error) throw error;
}

function queueCloudSave() {
    if (!supabaseClient || !currentAuthUser || !authDataReady || suspendCloudSync) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => saveCloudState().catch(() => toast('연결을 확인해 주세요. 코디는 이 기기에 남아 있어요.')), 500);
}
const originalStorageSetItem = Storage.prototype.setItem;
const originalStorageRemoveItem = Storage.prototype.removeItem;
Storage.prototype.setItem = function(key, value) {
    originalStorageSetItem.call(this, key, value);
    if (this === localStorage && CLOUD_DATA_KEYS.includes(String(key))) queueCloudSave();
};
Storage.prototype.removeItem = function(key) {
    originalStorageRemoveItem.call(this, key);
    if (this === localStorage && CLOUD_DATA_KEYS.includes(String(key))) queueCloudSave();
};

function restoreAccountState() {
    const read = (key, fallback) => {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? fallback;
        } catch {
            return fallback;
        }
    };
    events = read('ootd-events', {});
    characterConfig = read('codini-character', {
        hair: 'open',
        skin: 'default',
        eyes: 'default'
    });
    characterInitialized = false;
    customCategories = read('custom-clothing-types', []);
    customTopCategories = read('custom-top-types', []);
    customAccessoryCategories = read('custom-accessory-types', []);
    categoryOptions = [...baseCategories, ...customCategories];
    clothingPreferences = read('clothing-preferences', {});
    renderCategoryChoices();
    const feels = ['매우 추워요', '쌀쌀해요', '괜찮아요', '따뜻해요', '더워요'];
    const level = feels.indexOf(localStorage.getItem('feel-level'));
    document.getElementById('feelSlider').value = level < 0 ? 1 : level;
    updateFeelFromSlider();
    renderCalendar();
    looks = [];
    selected = 0;
    document.getElementById('suggest').classList.remove('show');
    document.getElementById('outfits').replaceChildren();
}

function processAuthUser(user) {
    if (user && processingAuthId === user.id && authSyncPromise) return authSyncPromise;
    processingAuthId = user?.id || null;
    authSyncPromise = synchronizeAuthUser(user);
    return authSyncPromise;
}

async function synchronizeAuthUser(user) {
    authDataReady = false;
    clearTimeout(cloudSaveTimer);
    if (!user) {
        const wasSignedIn = !!currentAuthUser;
        currentAuthUser = null;
        setAccountUi(null);
        if (wasSignedIn || localStorage.getItem('codini-data-owner')) {
            suspendCloudSync = true;
            CLOUD_DATA_KEYS.forEach(key => localStorage.removeItem(key));
            localStorage.removeItem('codini-data-owner');
            suspendCloudSync = false;
            if (!authRecoveryMode && !authActionBusy) location.reload();
        }
        return;
    }
    currentAuthUser = user;
    setAccountUi(user);
    suspendCloudSync = true;
    const owner = localStorage.getItem('codini-data-owner');
    if (owner && owner !== user.id) CLOUD_DATA_KEYS.forEach(key => localStorage.removeItem(key));
    // Claim the local cache before loading so a failed load cannot be imported by another account.
    localStorage.setItem('codini-data-owner', user.id);
    try {
        const {
            data,
            error
        } = await supabaseClient.from('user_app_data').select('data').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (currentAuthUser?.id !== user.id) return;
        if (data?.data && typeof data.data === 'object') {
            for (const key of CLOUD_DATA_KEYS) {
                const value = data.data[key];
                if (typeof value === 'string') localStorage.setItem(key, value);
                else localStorage.removeItem(key);
            }
        }
        restoreAccountState();
        authDataReady = true;
        suspendCloudSync = false;
        if (!data) await saveCloudState();
    } catch {
        if (currentAuthUser?.id === user.id) restoreAccountState();
        toast('로그인했지만 저장한 코디를 연결하지 못했어요. 연결 후 다시 로그인해 주세요.');
    } finally {
        suspendCloudSync = false;
        if (processingAuthId === user.id) processingAuthId = null;
    }
}

async function initSupabaseAuth() {
    setAccountUi(null);
    authInitializationError = '';
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || SUPABASE_URL.startsWith('YOUR_') || SUPABASE_PUBLISHABLE_KEY.startsWith('YOUR_')) {
        authInitializationError = '로그인 연결 설정이 아직 적용되지 않았어요. 사이트를 새로고침해 주세요.';
        return;
    }
    if (!window.supabase?.createClient) {
        authInitializationError = '로그인 파일을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';
        return;
    }
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') authRecoveryMode = true;
            setTimeout(async () => {
                try {
                    if (event === 'PASSWORD_RECOVERY') {
                        currentAuthUser = session?.user || null;
                        openEmailAuth('updatePasswordView');
                        return;
                    }
                    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') return;
                    if (event === 'SIGNED_IN' && currentAuthUser?.id === session?.user?.id && authDataReady) return;
                    await processAuthUser(session?.user || null);
                    if (session && !authActionBusy && !authRecoveryMode) finishEmailAuth();
                } catch {
                    toast('로그인 연결을 확인해 주세요.');
                }
            }, 0);
        });
        const {
            data,
            error
        } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (authRecoveryMode) {
            currentAuthUser = data.session?.user || null;
            openEmailAuth(data.session ? 'updatePasswordView' : 'resetPasswordView');
            if (!data.session) setAuthMessage('resetMessage', '재설정 링크가 만료되었어요. 새 메일을 받아 주세요.', 'error');
        } else {
            await processAuthUser(data.session?.user || null);
            if (data.session) finishEmailAuth();
        }
    } catch {
        // Keep a valid client: a session refresh failure must not disable signup.
        authInitializationError = '로그인 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
        if (authRecoveryMode) {
            openEmailAuth('resetPasswordView');
            setAuthMessage('resetMessage', '재설정 링크를 확인할 수 없어요. 연결을 확인하고 새 메일을 받아 주세요.');
        }
        toast('로그인 서비스를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
}

async function handleAccountButton() {
    if (!currentAuthUser) {
        openEmailAuth('loginView');
        return;
    }
    if (authActionBusy) return;
    authActionBusy = true;
    try {
        // Flush pending edits before ending the session.
        clearTimeout(cloudSaveTimer);
        await saveCloudState();
        const {
            error
        } = await supabaseClient.auth.signOut();
        if (error) throw error;
        await processAuthUser(null);
        location.reload();
    } catch {
        toast('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
        authActionBusy = false;
    }
}
