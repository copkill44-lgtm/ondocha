// auth.js — Supabase login and cloud synchronization
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL",
    SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY",
    CLOUD_DATA_KEYS = ["ootd-events", "codini-character", "feel-level", "custom-clothing-types", "custom-top-types", "custom-accessory-types", "clothing-preferences", "weather-city"];
let supabaseClient = null,
    currentAuthUser = null,
    cloudSaveTimer = null,
    suspendCloudSync = false,
    processingAuthId = null;

function setAccountUi(user) {
    let button = document.getElementById("accountButton"),
        label = document.getElementById("accountLabel");
    if (!button) return;
    button.textContent = user ? "로그아웃" : "Google 로그인";
    label.hidden = !user;
    label.textContent = user?.email || ""
}

function localAppData() {
    let data = {};
    CLOUD_DATA_KEYS.forEach(key => {
        let value = localStorage.getItem(key);
        if (value !== null) data[key] = value
    });
    return data
}
async function saveCloudState() {
    if (!supabaseClient || !currentAuthUser || suspendCloudSync) return;
    let {
        error
    } = await supabaseClient.from("user_app_data").upsert({
        user_id: currentAuthUser.id,
        data: localAppData(),
        updated_at: new Date().toISOString()
    }, {
        onConflict: "user_id"
    });
    if (error) {
        console.error("Cloud save failed", error);
        toast("계정 저장에 실패했어요. 연결 설정을 확인해 주세요.")
    }
}

function queueCloudSave() {
    if (!supabaseClient || !currentAuthUser || suspendCloudSync) return;
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(saveCloudState, 500)
}
const originalStorageSetItem = Storage.prototype.setItem,
    originalStorageRemoveItem = Storage.prototype.removeItem;
Storage.prototype.setItem = function (key, value) {
    originalStorageSetItem.call(this, key, value);
    if (this === localStorage && CLOUD_DATA_KEYS.includes(String(key))) queueCloudSave()
};
Storage.prototype.removeItem = function (key) {
    originalStorageRemoveItem.call(this, key);
    if (this === localStorage && CLOUD_DATA_KEYS.includes(String(key))) queueCloudSave()
};
async function processAuthUser(user) {
    if (!user) {
        let hadUser = !!currentAuthUser;
        currentAuthUser = null;
        setAccountUi(null);
        if (hadUser) {
            suspendCloudSync = true;
            CLOUD_DATA_KEYS.forEach(key => localStorage.removeItem(key));
            suspendCloudSync = false;
            location.reload()
        }
        return
    }
    if (processingAuthId === user.id) return;
    processingAuthId = user.id;
    currentAuthUser = user;
    try {
        let {
            data,
            error
        } = await supabaseClient.from("user_app_data").select("data").eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        if (data?.data && typeof data.data === "object") {
            let changed = false;
            suspendCloudSync = true;
            for (let key of CLOUD_DATA_KEYS) {
                let local = localStorage.getItem(key),
                    remote = data.data[key] ?? null;
                if (local !== remote) {
                    changed = true;
                    if (remote === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, remote)
                }
            }
            suspendCloudSync = false;
            setAccountUi(user);
            if (changed) {
                location.reload();
                return
            }
        } else {
            setAccountUi(user);
            await saveCloudState()
        }
    } catch (error) {
        suspendCloudSync = false;
        console.error("Account data sync failed", error);
        setAccountUi(user);
        toast("계정 데이터 연결에 실패했어요. 데이터베이스 설정을 확인해 주세요.")
    } finally {
        processingAuthId = null
    }
}
async function initSupabaseAuth() {
    setAccountUi(null);
    if (!window.supabase || SUPABASE_URL.startsWith("YOUR_") || SUPABASE_PUBLISHABLE_KEY.startsWith("YOUR_")) return;
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
        supabaseClient.auth.onAuthStateChange((_event, session) => setTimeout(() => processAuthUser(session?.user || null), 0));
        let {
            data,
            error
        } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (data.session) await processAuthUser(data.session.user)
    } catch (error) {
        console.error("Supabase initialization failed", error);
        toast("로그인 서비스를 연결하지 못했어요.")
    }
}
async function handleAccountButton() {
    if (!supabaseClient) {
        toast("Supabase URL과 공개 키 설정이 필요해요.");
        return
    }
    if (currentAuthUser) {
        let {
            error
        } = await supabaseClient.auth.signOut();
        if (error) {
            console.error(error);
            toast("로그아웃에 실패했어요.")
        }
        return
    }
    let {
        error
    } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        console.error(error);
        toast("Google 로그인에 실패했어요.")
    }
}
