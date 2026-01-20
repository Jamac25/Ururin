# Ololeeye - Testing Guide

## Pre-Launch Testing Checklist

### 1. Campaign Management ✅

#### Create Campaign
- [ ] Navigate to "Add Campaign" (+ button)
- [ ] Fill in all fields:
  - Name: "Test Campaign"
  - Goal: 5000
  - Zaad Number: 252634567890
  - PIN: 1234
  - Deadline: Future date
- [ ] Click "Create Campaign"
- [ ] Verify success message
- [ ] Verify redirect to campaign detail page

#### Edit Campaign
- [ ] Click campaign from list
- [ ] Click edit button
- [ ] Change goal to 6000
- [ ] Save changes
- [ ] Verify updated goal displays

#### Delete Campaign
- [ ] Click delete button
- [ ] Confirm deletion
- [ ] Verify campaign removed from list

### 2. Contributor Management ✅

#### Add Contributor
- [ ] Open campaign
- [ ] Click "Add Contributor"
- [ ] Fill in:
  - Name: "Ahmed Ali"
  - Phone: 252634111111
  - Amount: 100
- [ ] Save
- [ ] Verify contributor appears in list

#### Update Status
- [ ] Click contributor
- [ ] Mark as "Paid"
- [ ] Verify green checkmark
- [ ] Verify stats update

#### Delete Contributor
- [ ] Click delete on contributor
- [ ] Confirm deletion
- [ ] Verify removed from list

### 3. WhatsApp Integration ✅

#### Copy List
- [ ] Open campaign
- [ ] Scroll to "Jaa & Viesti"
- [ ] Click "Kopioi Liiska"
- [ ] Paste in text editor
- [ ] Verify format is correct
- [ ] Verify all contributors listed
- [ ] Verify summary shows correct totals

#### Copy Group Update
- [ ] Click "Kopioi Ryhmäpäivitys"
- [ ] Paste in text editor
- [ ] Verify shows: collected, goal, %, join link

#### Send Individual Message
- [ ] Click contributor
- [ ] Click "Send WhatsApp"
- [ ] Verify WhatsApp opens with pre-filled message

### 4. Statistics Dashboard ✅

#### View Stats
- [ ] Navigate to Stats page
- [ ] Verify all charts load:
  - Campaign performance bar chart
  - Timeline line chart
  - Status doughnut chart
- [ ] Verify top campaigns list
- [ ] Verify top contributors list
- [ ] Verify recent activity feed

#### Chart Interaction
- [ ] Click on campaign bar in chart
- [ ] Verify navigates to campaign detail
- [ ] Hover over charts
- [ ] Verify tooltips show correct data

### 5. Export Functionality ✅

#### Excel Export
- [ ] Go to Stats page
- [ ] Click "Export Dhammaan Ololaha (Excel)"
- [ ] Verify CSV file downloads
- [ ] Open file and verify data

#### JSON Export
- [ ] Click "Export Data (JSON)"
- [ ] Verify JSON file downloads
- [ ] Verify contains all campaigns, contributors

### 6. Settings ✅

#### Update Settings
- [ ] Go to Settings
- [ ] Change currency symbol to "€"
- [ ] Change default Zaad number
- [ ] Save
- [ ] Verify changes persist after refresh

#### Theme Toggle
- [ ] Click theme toggle button
- [ ] Verify switches between light/dark
- [ ] Verify preference persists

### 7. Validation Testing ✅

#### Campaign Validation
- [ ] Try to create campaign with:
  - Empty name → Should show error
  - Goal = 0 → Should show error
  - PIN with 3 digits → Should show error
  - Empty Zaad number → Should show error
  - Past deadline → Should show error

#### Contributor Validation
- [ ] Try to add contributor with:
  - Empty name → Should show error
  - Invalid phone → Should show error
  - Amount = 0 → Should show error
  - Duplicate phone → Should show error

### 8. Mobile Testing 📱

#### Responsive Design
- [ ] Open on mobile device or resize browser
- [ ] Verify bottom navigation works
- [ ] Verify all buttons are clickable
- [ ] Verify forms are usable
- [ ] Verify charts are responsive

#### Touch Interactions
- [ ] Test swipe gestures
- [ ] Test tap on all interactive elements
- [ ] Verify no double-tap zoom issues

### 9. Offline Functionality 🔌

#### PWA Testing
- [ ] Install as PWA (Add to Home Screen)
- [ ] Disconnect internet
- [ ] Verify app still loads
- [ ] Create campaign offline
- [ ] Verify data persists
- [ ] Reconnect internet
- [ ] Verify app still works

### 10. Supabase Cloud Sync ☁️

#### Authentication
- [ ] Click "Register"
- [ ] Create account with email/password
- [ ] Verify email confirmation
- [ ] Login with credentials
- [ ] Verify successful login

#### Data Migration
- [ ] Create some campaigns locally
- [ ] Login to Supabase
- [ ] Click "Migrate to Cloud"
- [ ] Verify success message
- [ ] Open app on different device/browser
- [ ] Login with same account
- [ ] Verify data synced

### 11. Edge Cases 🔍

#### Empty States
- [ ] View stats with no campaigns
- [ ] View contributors with no data
- [ ] Verify empty state messages display

#### Large Data
- [ ] Create 50+ campaigns
- [ ] Add 100+ contributors
- [ ] Verify performance is acceptable
- [ ] Verify charts still render

#### Special Characters
- [ ] Use names with special characters (é, ñ, etc.)
- [ ] Use emojis in campaign names
- [ ] Verify displays correctly

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Performance Checklist

- [ ] Page load < 3 seconds
- [ ] Charts render < 1 second
- [ ] Form submissions < 500ms
- [ ] No console errors
- [ ] No memory leaks (check DevTools)

## Security Checklist

- [ ] PIN validation works
- [ ] No sensitive data in localStorage visible
- [ ] Supabase credentials not exposed
- [ ] XSS protection verified

## Final Checks

- [ ] All validation working
- [ ] All buttons functional
- [ ] All navigation working
- [ ] All exports working
- [ ] All charts displaying
- [ ] Mobile responsive
- [ ] Offline capable
- [ ] No console errors
- [ ] No broken links

## Sign-off

- [ ] All critical tests passed
- [ ] All bugs fixed
- [ ] Ready for production deployment

---

**Testing completed by:** _______________
**Date:** _______________
**Status:** ⬜ PASS / ⬜ FAIL
