// Provider secrets belong only in the provider console and Supabase.
async function startSocialLogin(provider, messageId = 'loginMessage') {
    if (authActionBusy || !['google', 'kakao', 'naver'].includes(provider)) return;
    const redirectTo = emailAuthRedirect();
    if (!redirectTo) {
        setAuthMessage(messageId, '웹사이트 주소로 접속한 뒤 다시 시도해 주세요.');
        return;
    }
    const providerId = provider === 'naver' ? ONDOCHA_CONFIG.naverOAuthProvider : provider;
    if (!providerId || (provider === 'naver' && !/^custom:[a-z0-9-]+$/.test(providerId))) {
        setAuthMessage(messageId, '네이버 로그인은 아직 준비 중이에요. 이메일로 계속해 주세요.');
        return;
    }
    authActionBusy = true;
    const buttons = [...document.querySelectorAll('.social-login, .auth-form button')];
    buttons.forEach(button => button.disabled = true);
    setAuthMessage(messageId, '로그인 페이지로 연결하고 있어요…', 'info');
    try {
        await authInitialization;
        if (!supabaseClient) {
            authInitialization = initSupabaseAuth();
            await authInitialization;
        }
        if (!supabaseClient) throw new Error('auth_unavailable');
        // OAuth URL creation alone does not verify provider availability.
        if (provider !== 'naver') {
            const response = await fetch(SUPABASE_URL + '/auth/v1/settings', {
                headers: { apikey: SUPABASE_PUBLISHABLE_KEY }
            });
            if (!response.ok) throw new Error('settings_unavailable');
            const settings = await response.json();
            if (!settings.external?.[provider]) {
                setAuthMessage(messageId, '이 로그인은 아직 준비 중이에요. 이메일로 계속해 주세요.');
                return;
            }
        }
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: providerId,
            options: {
                redirectTo,
                skipBrowserRedirect: true,
                // scopes appends to Supabase defaults; singular scope overrides the provider request.
                ...(provider === 'kakao' ? { queryParams: { scope: 'profile_nickname profile_image' } } : {})
            }
        });
        if (error) throw error;
        if (!data?.url) throw new Error('missing_authorization_url');
        window.location.assign(data.url);
    } catch {
        setAuthMessage(messageId, '로그인을 연결하지 못했어요. 잠시 후 다시 시도하거나 이메일로 계속해 주세요.');
    } finally {
        authActionBusy = false;
        buttons.forEach(button => button.disabled = false);
    }
}
