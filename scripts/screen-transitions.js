// screen-transitions.js — Account screen transitions
// Fade between the account screens and the adjoining setup screens.
let screenFadeBusy = false;
async function fadeScreenChange(outgoing, change, incoming) {
    if (screenFadeBusy) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !outgoing || !outgoing.getClientRects().length) {
        change();
        return;
    }
    screenFadeBusy = true;
    let leaving, entering;
    try {
        leaving = outgoing.animate([{
            opacity: 1
        }, {
            opacity: 0
        }], {
            duration: 180,
            easing: 'ease-in',
            fill: 'forwards'
        });
        await leaving.finished;
        change();
        const target = incoming();
        if (target) {
            entering = target.animate([{
                opacity: 0
            }, {
                opacity: 1
            }], {
                duration: 320,
                easing: 'ease-out',
                fill: 'both'
            });
            await entering.finished;
        }
    } finally {
        if (leaving) leaving.cancel();
        if (entering) entering.cancel();
        screenFadeBusy = false;
    }
}
const originalAccountChoice = openAccountChoice;
openAccountChoice = function() {
    return fadeScreenChange(document.getElementById('onboarding'), () => originalAccountChoice(), () => document.getElementById('accountFlow'));
};
const originalAccountView = showAccountView;
showAccountView = function(id) {
    const current = document.querySelector('.account-view.active');
    if (screenFadeBusy || !current || current.id === id) {
        originalAccountView(id);
        return;
    }
    return fadeScreenChange(current, () => originalAccountView(id), () => document.getElementById(id));
};
const originalContinueWithoutAccount = continueWithoutAccount;
continueWithoutAccount = function() {
    return fadeScreenChange(document.getElementById('accountFlow'), () => originalContinueWithoutAccount(), () => document.getElementById('characterSetup'));
};
