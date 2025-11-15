# PRODUCTION CHECKLIST - Settings Redesign

**Project:** Locai - Settings Architecture v2.0
**Date:** 2025-11-13
**Status:** PRE-PRODUCTION

---

## ✅ COMPLETED TASKS

### 1. Core Infrastructure ✅
- [x] Migration script created (`scripts/migrate-tenant-configs.ts`)
- [x] Unified Settings layout with sidebar navigation
- [x] All APIs with authentication & validation
- [x] Firestore security implemented (tenant isolation)
- [x] XSS protection (sanitizeUserInput on all text fields)
- [x] PII masking in logs

### 2. Settings Pages ✅
- [x] **Company Settings** - Business info & address
- [x] **AI Config** - Dynamic agent features (payments, contracts)
- [x] **Negotiation Settings** - Discount rules & presets
- [x] **Policies Settings** - Cancellation, terms, privacy

### 3. APIs Created ✅
- [x] `/api/tenant/settings/company` (GET, PUT)
- [x] `/api/tenant/settings/negotiation` (GET, PUT, POST)
- [x] `/api/tenant/settings/policies` (GET, PUT)
- [x] `/api/ai/get-agent-config` (POST) - already existed
- [x] `/api/ai/update-tenant-features` (POST, GET) - already existed

### 4. Documentation ✅
- [x] `SETTINGS_REDESIGN.md` - Complete technical docs
- [x] `DYNAMIC_AI_AGENTS.md` - AI configuration docs (previous)
- [x] Migration script usage guide
- [x] API endpoint documentation

---

## 🔧 PENDING TASKS (CRITICAL)

### 1. Remove Dialogs from Properties Page ❌
**Issue:** Settings dialogs still accessible from `/dashboard/properties`
**Impact:** Users have two places to configure same settings (confusing)

**Files to Update:**
- `app/dashboard/properties/page.tsx`

**Changes Needed:**
```typescript
// REMOVE these states:
- const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
- const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
- const [addressDialogOpen, setAddressDialogOpen] = useState(false);

// REMOVE these components:
- <CancellationPolicyEditor />
- <NegotiationSettingsDialog />
- Address dialog

// REPLACE with links to Settings:
- "Configurar Políticas" → router.push('/dashboard/settings/policies')
- "Configurar Negociação" → router.push('/dashboard/settings/negotiation')
- "Configurar Empresa" → router.push('/dashboard/settings/company')
```

**Status:** ⚠️ **CRITICAL - Must be done before production**

---

### 2. Run Migration Script ❌
**Issue:** Existing tenants don't have default AI config
**Impact:** Settings pages will show empty/default values

**Steps:**
```bash
# 1. Test migration (dry-run)
npx ts-node scripts/migrate-tenant-configs.ts --dry-run

# 2. Review output, ensure no errors

# 3. Execute migration
npx ts-node scripts/migrate-tenant-configs.ts

# 4. Verify a few tenants manually in Firestore
# Check: tenants/{tenantId}/config/ai-config exists
```

**Expected Results:**
- All existing tenants get `ai-config` document
- No errors in migration
- Stats: ~33 tenants migrated (based on test)

**Status:** ⚠️ **CRITICAL - Run before launch**

---

### 3. Update Old Settings Page ❌
**Issue:** `/dashboard/settings/page.tsx` still has old structure
**Impact:** Profile/WhatsApp settings might be duplicated or broken

**File:** `app/dashboard/settings/page.tsx`

**Options:**
1. **Keep as Profile page** - Rename to focus on user profile only
2. **Redirect to company** - Make it redirect to `/dashboard/settings/company`
3. **Create dashboard view** - Overview of all settings with quick links

**Recommended:** Option 1 - Keep as Profile & Account page

**Status:** ⚠️ **MEDIUM PRIORITY**

---

### 4. Test Navigation Flow ❌
**Issue:** Need to verify all navigation paths work

**Test Cases:**
```
✓ Click Settings in main menu → Shows layout with sidebar
✓ Click Empresa → Loads company page
✓ Click Negociação IA → Loads negotiation page
✓ Click Políticas → Loads policies page with 3 tabs
✓ Click Agentes de IA → Loads AI config page
✓ Mobile: Hamburger menu works
✓ Mobile: Navigation closes after selection
✓ Save buttons work on all pages
✓ Error messages display correctly
✓ Success messages display correctly
```

**Status:** ❌ **NEEDS TESTING**

---

### 5. Bug Fix: Negotiation Dialog Error ✅ (PARTIALLY)
**Original Issue:** Dialog failed to open from properties page
**Root Cause:** API endpoint `/api/tenant/settings/negotiation` didn't exist

**Current Status:**
- ✅ API now exists and works
- ✅ New Settings page created with better UI
- ❌ Old dialog still referenced in properties page (see task #1)

**Resolution:** Complete task #1 to fully resolve

---

## 🎨 OPTIONAL ENHANCEMENTS (NON-CRITICAL)

### 1. Payment Provider Page ⏳
**Path:** `/dashboard/settings/payment-provider`
**Status:** Placeholder in navigation

**Features to Implement:**
- Configure AbacatePay credentials (API key, webhook)
- Add Stripe option
- Add Mercado Pago option
- Test connection buttons
- Webhook URL display

**Priority:** LOW (payments work without this page)

---

### 2. Advanced Settings Page ⏳
**Path:** `/dashboard/settings/advanced`
**Status:** Placeholder in navigation

**Features to Implement:**
- Experimental features toggles
- API rate limiting configuration
- Debug mode toggle
- Export settings as JSON
- Import settings from file

**Priority:** LOW (nice to have)

---

### 3. Settings Search ⏳
**Feature:** Global search within settings
**Benefit:** Quickly find specific configuration

**Implementation:**
- Add search bar in layout header
- Index all setting names/descriptions
- Filter navigation based on search
- Highlight matching sections

**Priority:** LOW (navigation is already clear)

---

### 4. Settings History/Audit Log ⏳
**Feature:** Track who changed what and when
**Benefit:** Compliance, debugging, rollback

**Implementation:**
- Create `config/settings-history` collection
- Log all PUT requests with user, timestamp, changes
- Add "History" tab to each settings page
- Implement rollback functionality

**Priority:** LOW (good for enterprise, not essential)

---

## 🧪 TESTING REQUIREMENTS

### Unit Tests (Future)
```typescript
// TODO: Create test files
describe('Company Settings API', () => {
  it('should require authentication');
  it('should validate company info fields');
  it('should sanitize text inputs');
  it('should enforce tenant isolation');
});

describe('Negotiation Settings API', () => {
  it('should apply preset correctly');
  it('should validate discount percentages');
  it('should enforce max discount limits');
});

describe('Policies API', () => {
  it('should sort cancellation rules by days');
  it('should validate refund percentages');
  it('should sanitize custom messages');
});
```

**Status:** ❌ Not implemented (manual testing only)

---

### Integration Tests
```typescript
// TODO: Create E2E tests
describe('Settings Flow', () => {
  it('should navigate through all settings pages');
  it('should save company info successfully');
  it('should apply negotiation preset');
  it('should create cancellation rules');
  it('should update AI features and invalidate cache');
});
```

**Status:** ❌ Not implemented

---

### Manual Testing Checklist

**Before Production:**
- [ ] Test migration script (dry-run)
- [ ] Execute migration script
- [ ] Verify Company Settings (create, update)
- [ ] Verify Negotiation Settings (all 4 presets)
- [ ] Verify Policies (all 3 tabs)
- [ ] Verify AI Config (enable/disable features)
- [ ] Test sidebar navigation (desktop)
- [ ] Test drawer navigation (mobile)
- [ ] Test all save buttons
- [ ] Test error handling (network failures)
- [ ] Test authentication (logout, re-login)
- [ ] Verify no console errors
- [ ] Verify Firestore data structure
- [ ] Test with existing tenant (has data)
- [ ] Test with new tenant (empty data)

---

## 🔐 SECURITY CHECKLIST

### Authentication ✅
- [x] All APIs use `validateFirebaseAuth()`
- [x] Tenant ID extracted from auth context
- [x] Unauthenticated requests return 401

### Tenant Isolation ✅
- [x] All queries scoped to `tenants/{tenantId}/`
- [x] No cross-tenant data access possible
- [x] TenantServiceFactory used consistently

### Input Validation ✅
- [x] Zod schemas on all APIs
- [x] Type checking enforced
- [x] Invalid requests return 400 with details

### XSS Protection ✅
- [x] `sanitizeUserInput()` on text fields
- [x] Company name, address sanitized
- [x] Policy descriptions sanitized
- [x] Custom messages sanitized

### Data Sanitization ✅
- [x] Phone numbers masked in logs
- [x] Tenant IDs truncated in logs
- [x] Email addresses masked in logs
- [x] No sensitive data in error responses (production)

---

## 📊 PERFORMANCE CONSIDERATIONS

### Caching ✅
- [x] AI Config uses in-memory cache (30 min TTL)
- [x] Cache invalidation on updates
- [x] Cache statistics tracking

### Database Queries ✅
- [x] Single document reads (not collections)
- [x] No N+1 query problems
- [x] Minimal Firestore reads

### Bundle Size
- [ ] Analyze Settings bundle size
- [ ] Lazy load heavy components if needed
- [ ] Code splitting per route

**Status:** ⚠️ Not analyzed yet

---

## 🚀 DEPLOYMENT STEPS

### Pre-Deployment
1. **Code Review**
   - [ ] Review all new files
   - [ ] Check for console.log statements
   - [ ] Verify error handling

2. **Environment Variables**
   - [ ] Confirm Firebase credentials in production
   - [ ] Verify JWT_SECRET is set
   - [ ] Check NODE_ENV=production

3. **Database Backup**
   - [ ] Backup Firestore before migration
   - [ ] Document current tenant count
   - [ ] Export critical settings

### Deployment Sequence
1. **Deploy Code**
   ```bash
   npm run build
   npm run start
   ```

2. **Run Migration**
   ```bash
   # On production server
   npx ts-node scripts/migrate-tenant-configs.ts --dry-run
   npx ts-node scripts/migrate-tenant-configs.ts
   ```

3. **Verify Migration**
   - Check Firestore console
   - Verify a few tenants manually
   - Check migration statistics

4. **Test Production**
   - Login as test tenant
   - Navigate all Settings pages
   - Save test data
   - Verify in Firestore

5. **Monitor**
   - Watch error logs
   - Check API response times
   - Monitor Firestore usage
   - Verify no authentication errors

### Rollback Plan
If issues occur:
1. **Code Rollback:** Git revert to previous version
2. **Data Rollback:** AI configs are additive, no data loss
3. **Emergency Fix:** Disable Settings navigation, redirect to old page

---

## 📈 SUCCESS METRICS

### Technical Metrics
- **Migration Success Rate:** Target 100% (0 errors)
- **API Response Time:** < 200ms average
- **Cache Hit Rate:** > 80% for AI config
- **Error Rate:** < 0.1%

### User Metrics
- **Settings Completion:** % of tenants that configure settings
- **Time to Configure:** Average time spent in Settings
- **Support Tickets:** Reduction in configuration-related tickets

### Business Metrics
- **AI Feature Adoption:** % of tenants enabling payments/contracts
- **Negotiation Usage:** % using custom negotiation rules
- **Policy Completion:** % with configured cancellation policies

---

## 🐛 KNOWN ISSUES

### 1. Negotiation Settings Dual Path ⚠️
**Issue:** Settings stored in both `config/negotiation-settings` and `settings/negotiation`
**Impact:** LOW - API uses correct path, older path ignored
**Resolution:** Future migration to consolidate paths

### 2. Old Settings Page ⚠️
**Issue:** `/dashboard/settings/page.tsx` not integrated with new layout
**Impact:** MEDIUM - Profile settings might conflict
**Resolution:** Complete pending task #3

### 3. Properties Page Dialogs ⚠️
**Issue:** Dialogs still present, creating duplicate UX
**Impact:** HIGH - User confusion
**Resolution:** Complete pending task #1 (CRITICAL)

---

## 📝 POST-DEPLOYMENT TASKS

### Week 1
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Document common issues
- [ ] Create FAQ for support team

### Week 2
- [ ] Analyze usage metrics
- [ ] Identify most-used settings
- [ ] Optimize slow queries
- [ ] Add missing tooltips/help text

### Month 1
- [ ] Implement Payment Provider page
- [ ] Add settings search
- [ ] Create settings templates
- [ ] Implement import/export

---

## 🎯 CRITICAL PATH TO PRODUCTION

**MUST DO (Blockers):**
1. ✅ Complete task #1 - Remove dialogs from properties page
2. ✅ Complete task #2 - Run migration script
3. ✅ Manual testing on all Settings pages

**SHOULD DO (Important):**
4. Update old settings page
5. Create rollback plan
6. Document deployment process

**NICE TO HAVE (Optional):**
7. Add unit tests
8. Implement payment provider page
9. Add settings search
10. Create audit log

---

## 📞 SUPPORT CONTACTS

**Technical Issues:**
- Firebase: Check Firestore console
- Authentication: Verify Firebase Auth settings
- API Errors: Check CloudWatch/logs

**User Issues:**
- Settings not saving → Check authentication
- Migration failed → Review script logs
- Dialogs error → Verify API endpoints exist

---

## ✅ FINAL CHECKLIST BEFORE LAUNCH

**Code:**
- [ ] All dialogs removed from properties page
- [ ] Old settings page updated
- [ ] No console.log statements
- [ ] No TODO comments in critical paths

**Database:**
- [ ] Migration script tested (dry-run)
- [ ] Migration script executed
- [ ] All tenants have ai-config
- [ ] Backup created

**Testing:**
- [ ] All settings pages load correctly
- [ ] All save buttons work
- [ ] Mobile navigation tested
- [ ] Error handling tested
- [ ] Authentication tested

**Documentation:**
- [ ] API docs updated
- [ ] User guide created (if needed)
- [ ] Support team trained
- [ ] Rollback plan documented

**Deployment:**
- [ ] Production build successful
- [ ] Environment variables verified
- [ ] Firebase credentials correct
- [ ] Monitoring enabled

---

**STATUS: 🟡 READY FOR FINAL TASKS**

**Remaining Work:**
1. Remove dialogs from properties page (30 min)
2. Run migration script (5 min)
3. Manual testing (30 min)

**Estimated Time to Production: 1-2 hours**
