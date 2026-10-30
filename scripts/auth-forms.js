// Email/password forms. Passwords are sent only to Supabase Auth.
let authInitialization = null;
let authActionBusy = false;
let authReturnToApp = false;
let authRecoveryMode = new URL(window.location.href).searchParams.get('auth') === 'recovery' ||
    new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';

function setAuthMessage(id, text, kind = 'error') {
    const node = document.getElementById(id);
    node.textContent = text;
    node.dataset.kind = kind;
    node.hidden = !text;
}

function emailAuthError(error) {
    const messages = {
        invalid_credentials: '이메일 또는 비밀번호를 확인해 주세요.',
        email_not_confirmed: '받은 메일에서 이메일 확인을 마친 뒤 로그인해 주세요.',
        user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
        email_exists: '이미 가입된 이메일이에요. 로그인해 주세요.',
        weak_password: '더 안전한 비밀번호로 다시 입력해 주세요.',
        same_password: '기존 비밀번호와 다른 비밀번호를 정해 주세요.',
        over_email_send_rate_limit: '메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.',
        over_request_rate_limit: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
        email_address_invalid: '이메일 주소를 확인해 주세요.',
        signup_disabled: '지금은 회원가입을 진행할 수 없어요.',
        otp_expired: '링크가 만료되었어요. 새 메일을 받아 주세요.'
    };
    return messages[error?.code] || '요청을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';
}

function openEmailAuth(view = 'loginView') {
    const flow = document.getElementById('accountFlow');
    if (!flow.classList.contains('visible')) {
        authReturnToApp = document.getElementById('app').style.display !== 'none';
    }
    for (const id of ['welcome', 'onboarding', 'characterSetup', 'characterPraise']) {
        const screen = document.getElementById(id);
        screen.classList.remove('visible');
        screen.style.display = 'none';
        screen.setAttribute('aria-hidden', 'true');
    }
    flow.classList.add('visible');
    flow.setAttribute('aria-hidden', 'false');
    showAccountView(view);
}

function leaveEmailAuth() {
    if (authActionBusy) return;
    document.querySelectorAll('.auth-form input[type="password"]').forEach(input => input.value = '');
    if (authReturnToApp) {
        document.getElementById('accountFlow').classList.remove('visible');
        document.getElementById('accountFlow').setAttribute('aria-hidden', 'true');
        document.getElementById('accountButton').focus();
    } else showAccountView('accountChoice');
}

function finishEmailAuth() {
    if (!currentAuthUser || authRecoveryMode) return;
    document.querySelectorAll('.auth-form input[type="password"]').forEach(input => input.value = '');
    for (const id of ['welcome', 'onboarding', 'accountFlow']) {
        const screen = document.getElementById(id);
        screen.classList.remove('visible');
        if (id === 'welcome') screen.style.display = 'none';
        screen.setAttribute('aria-hidden', 'true');
    }
    if (localStorage.getItem('codini-character')) {
        document.getElementById('app').style.display = 'block';
        renderCalendar();
        document.getElementById('accountButton').focus({
            preventScroll: true
        });
    } else openCharacterSetup();
}

function emailAuthRedirect(recovery = false) {
    if (!['https:', 'http:'].includes(window.location.protocol)) return null;
    const url = new URL(window.location.origin + window.location.pathname);
    if (recovery) url.searchParams.set('auth', 'recovery');
    return url.href;
}

async function runEmailAuth(event, messageId, operation) {
    event.preventDefault();
    const form = event.currentTarget;
    if (authActionBusy || !form.reportValidity()) return;
    authActionBusy = true;
    const buttons = [...document.querySelectorAll('.auth-form button')];
    buttons.forEach(button => button.disabled = true);
    form.setAttribute('aria-busy', 'true');
    setAuthMessage(messageId, '연결하고 있어요…', 'info');
    try {
        await authInitialization;
        if (!supabaseClient) {
            setAuthMessage(messageId, '이메일 로그인을 아직 준비 중이에요. 잠시 후 다시 이용해 주세요.');
            return;
        }
        await operation();
    } catch (error) {
        setAuthMessage(messageId, emailAuthError(error));
    } finally {
        authActionBusy = false;
        buttons.forEach(button => button.disabled = false);
        form.setAttribute('aria-busy', 'false');
        form.querySelectorAll('input[type="password"]').forEach(input => input.value = '');
    }
}

function submitEmailLogin(event) {
    return runEmailAuth(event, 'loginMessage', async () => {
        const {
            data,
            error
        } = await supabaseClient.auth.signInWithPassword({
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        });
        if (error) throw error;
        if (!data.session) throw new Error('Missing session');
        await processAuthUser(data.session.user);
        setAuthMessage('loginMessage', '', 'success');
        finishEmailAuth();
    });
}

function submitEmailSignup(event) {
    return runEmailAuth(event, 'signupMessage', async () => {
        const password = document.getElementById('signupPassword').value;
        if (password !== document.getElementById('signupPasswordConfirm').value) {
            setAuthMessage('signupMessage', '두 비밀번호가 같지 않아요. 다시 입력해 주세요.');
            return;
        }
        if (password.length < 8) {
            setAuthMessage('signupMessage', '비밀번호는 8자 이상 입력해 주세요.');
            return;
        }
        const redirect = emailAuthRedirect();
        if (!redirect) {
            setAuthMessage('signupMessage', '웹사이트 주소로 접속한 뒤 가입해 주세요.');
            return;
        }
        const email = document.getElementById('signupEmail').value.trim();
        const {
            data,
            error
        } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirect
            }
        });
        if (error) throw error;
        document.getElementById('loginEmail').value = email;
        if (data.session) {
            await processAuthUser(data.session.user);
            finishEmailAuth();
        } else setAuthMessage('signupMessage', '가입 확인 메일을 확인해 주세요. 메일의 링크를 누른 뒤 로그인할 수 있어요. 이미 가입했다면 로그인해 주세요.', 'success');
    });
}

function submitPasswordReset(event) {
    return runEmailAuth(event, 'resetMessage', async () => {
        const redirectTo = emailAuthRedirect(true);
        if (!redirectTo) {
            setAuthMessage('resetMessage', '웹사이트 주소로 접속한 뒤 다시 요청해 주세요.');
            return;
        }
        const {
            error
        } = await supabaseClient.auth.resetPasswordForEmail(
            document.getElementById('resetEmail').value.trim(), {
                redirectTo
            }
        );
        if (error) throw error;
        setAuthMessage('resetMessage', '가입된 이메일이라면 재설정 메일이 도착해요. 스팸함도 확인해 주세요.', 'success');
    });
}

function clearRecoveryAddress() {
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    if (/access_token=|error=|type=recovery/.test(url.hash)) url.hash = '';
    window.history.replaceState(null, '', url.href);
}

function submitNewPassword(event) {
    return runEmailAuth(event, 'updateMessage', async () => {
        const password = document.getElementById('newPassword').value;
        if (password !== document.getElementById('newPasswordConfirm').value) {
            setAuthMessage('updateMessage', '두 비밀번호가 같지 않아요. 다시 입력해 주세요.');
            return;
        }
        if (password.length < 8) {
            setAuthMessage('updateMessage', '비밀번호는 8자 이상 입력해 주세요.');
            return;
        }
        const {
            data,
            error: sessionError
        } = await supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;
        if (!authRecoveryMode || !data.session) {
            setAuthMessage('updateMessage', '재설정 링크가 만료되었어요. 새 메일을 받아 주세요.');
            return;
        }
        const {
            error
        } = await supabaseClient.auth.updateUser({
            password
        });
        if (error) throw error;
        const {
            error: logoutError
        } = await supabaseClient.auth.signOut({
            scope: 'local'
        });
        if (logoutError) throw logoutError;
        await processAuthUser(null);
        authRecoveryMode = false;
        clearRecoveryAddress();
        showAccountView('loginView');
        setAuthMessage('loginMessage', '비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.', 'success');
    });
}

async function cancelPasswordRecovery() {
    if (authActionBusy) return;
    authActionBusy = true;
    try {
        if (supabaseClient) {
            const {
                error
            } = await supabaseClient.auth.signOut({
                scope: 'local'
            });
            if (error) throw error;
        }
        await processAuthUser(null);
        authRecoveryMode = false;
        clearRecoveryAddress();
        showAccountView('loginView');
    } catch (error) {
        setAuthMessage('updateMessage', emailAuthError(error));
    } finally {
        authActionBusy = false;
    }
}
