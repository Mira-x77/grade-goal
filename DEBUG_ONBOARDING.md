# Debug Onboarding Blank Screen

## Quick Diagnostic Commands

Open browser console (F12) and run these commands one by one:

### 1. Check if content exists in DOM
```javascript
document.querySelector('.content-col')
```
**Expected:** Should return an HTML element
**If null:** Content isn't rendering

### 2. Check if OnboardingScreen is mounted
```javascript
document.querySelector('[class*="motion"]')
```
**Expected:** Should return elements
**If null:** Component isn't mounting

### 3. Check localStorage state
```javascript
JSON.parse(localStorage.getItem('scoretarget_state'))
```
**Expected:** Should show an object with `step: "onboarding"`
**If null:** No state exists

### 4. Force clear and reload
```javascript
localStorage.clear(); location.reload()
```
**This will:** Clear all data and reload the page

### 5. Check if elements are hidden by CSS
```javascript
Array.from(document.querySelectorAll('*')).filter(el => {
  const style = window.getComputedStyle(el);
  return style.opacity === '0' || style.display === 'none' || style.visibility === 'hidden';
}).length
```
**Expected:** Should show how many hidden elements exist

### 6. Check viewport/scroll position
```javascript
window.scrollY
```
**Expected:** Should be 0 or close to 0
**If large number:** Page might be scrolled down

### 7. Check if mascot/images are loading
```javascript
document.querySelectorAll('img').length
```
**Expected:** Should show number of images

### 8. Force show all content (CSS override)
```javascript
document.body.style.cssText = 'opacity: 1 !important; visibility: visible !important;';
Array.from(document.querySelectorAll('*')).forEach(el => {
  el.style.cssText = 'opacity: 1 !important; visibility: visible !important; display: block !important;';
});
```
**This will:** Force all elements to be visible

---

## What to Report Back

After running these commands, tell me:
1. Which commands returned `null` or unexpected values?
2. Did command #8 (force show) make anything appear?
3. What does command #3 show for the state?

---

## Alternative: Check React DevTools

If you have React DevTools installed:
1. Open DevTools → Components tab
2. Look for `Index` component
3. Check its props and state
4. Look for `OnboardingScreen` component
5. Check what `step` prop it has

---

## Nuclear Option: Bypass Onboarding

If nothing works, run this to skip onboarding:
```javascript
localStorage.setItem('scoretarget_state', JSON.stringify({
  step: "results",
  targetMin: 16,
  targetAverage: 16,
  subjects: [{
    id: "test-1",
    name: "Test Subject",
    coefficient: 3,
    marks: { interro: null, dev: null, compo: null }
  }],
  settings: { gradingSystem: "apc", apcWeightedSplit: false },
  studentName: "Test User",
  classLevel: "Terminale",
  serie: "C",
  semester: "1st Semester"
}));
location.href = '/';
```
**This will:** Create fake data and go to Home screen
