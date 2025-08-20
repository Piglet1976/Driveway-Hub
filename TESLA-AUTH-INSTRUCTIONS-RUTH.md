# Tesla Authorization Instructions for Ruth
## Live Investor Demo - Vehicle Authorization Setup

### Overview
Ruth, as the Tesla host in Mississauga, you'll need to authorize your Tesla vehicle so Manuel can track it during his 25km journey from York to your premium charging station at 528 Bluesky Crescent, Mississauga.

---

## Step-by-Step Authorization Process

### Step 1: Access the Platform
1. Open your browser and navigate to: **https://161.35.176.111**
2. You'll see a security warning - click **"Advanced"** then **"Proceed to 161.35.176.111"**
   - This is expected as we're using a direct IP for the demo

### Step 2: Login to Your Host Account
```
Email: ruth.tesla@driveway-hub.com
Password: Demo2024!
```

### Step 3: Navigate to Tesla Authorization
1. Once logged in, click on **"Profile"** in the top navigation
2. Select **"Tesla Integration"** from the menu
3. Click the **"Connect Tesla Account"** button

### Step 4: Tesla OAuth Flow
1. You'll be redirected to Tesla's official login page
2. Enter your **Tesla account credentials** (your personal Tesla login)
3. Review the permissions requested:
   - ✅ User Data (profile information)
   - ✅ Vehicle Data (location, battery, speed)
   - ✅ Vehicle Commands (navigation, locks)
   - ✅ Charging Commands (charging control)
4. Click **"Authorize"** to grant access

### Step 5: Select Your Vehicle
1. After authorization, you'll return to the platform
2. Select your Tesla from the dropdown list
3. Confirm it's the correct vehicle (check VIN last 6 digits)
4. Click **"Activate for Hosting"**

### Step 6: Verify Integration
1. The dashboard will show:
   - ✅ Tesla Account Connected
   - ✅ Vehicle: [Your Tesla Model]
   - ✅ Status: Ready for Tracking
   - ✅ Battery Level: [Current %]
   - ✅ Location Services: Active

---

## Pre-Demo Checklist (Day of Demo)

### Morning of Demo (9:00 AM)
- [ ] Ensure Tesla is charged to at least 80%
- [ ] Verify Tesla app shows location services enabled
- [ ] Confirm vehicle is parked at home (528 Bluesky Crescent)
- [ ] Test unlock/lock from Tesla app

### 1 Hour Before Demo (10:00 AM)
- [ ] Login to platform and verify connection status
- [ ] Check that real-time data is updating (battery %, location)
- [ ] Ensure driveway is clear for arrival
- [ ] Turn on exterior lighting if demo is in evening

### 30 Minutes Before (10:30 AM)
- [ ] Open platform dashboard on display device
- [ ] Start screen recording software (if recording demo)
- [ ] Have backup phone ready with Tesla app
- [ ] Confirm Manuel is ready at York location

---

## During the Demo

### Your Role as Host:
1. **Monitor Dashboard**: Watch the host dashboard showing:
   - Manuel's booking status
   - ETA to your location
   - Real-time map tracking
   - Notifications of key milestones

2. **Key Milestones to Watch**:
   - **11:00 AM**: Manuel starts journey from York
   - **11:10 AM**: 5km progress notification
   - **11:20 AM**: Halfway point (12.5km)
   - **11:30 AM**: 5km from destination alert
   - **11:35 AM**: 2km arrival warning
   - **11:40 AM**: Arrival at your driveway

3. **Upon Arrival**:
   - Platform automatically detects arrival
   - Booking status changes to "Active"
   - Charging session can begin
   - Payment processing initiates

---

## Troubleshooting

### If Authorization Fails:
1. Clear browser cache and cookies
2. Try incognito/private browser mode
3. Use backup URL: https://161.35.176.111/auth/tesla/retry
4. Contact support line: [Demo Support Number]

### If Real-Time Tracking Stops:
1. Check Tesla app - ensure location services active
2. Refresh platform dashboard (F5)
3. Verify cellular connection on Tesla
4. Fallback: Use Tesla app sharing for backup tracking

### Connection Issues:
```bash
# Quick reconnection steps:
1. Logout from platform
2. Re-login with credentials
3. Go to Tesla Integration
4. Click "Refresh Connection"
5. Re-authorize if prompted
```

---

## Important URLs & Credentials

### Platform Access:
- **Production**: https://161.35.176.111
- **Host Login**: ruth.tesla@driveway-hub.com / Demo2024!
- **Dashboard**: https://161.35.176.111/host/dashboard
- **Tesla Settings**: https://161.35.176.111/settings/tesla

### Support Contacts:
- **Technical Support**: [Your Phone]
- **Demo Coordinator**: [Coordinator Phone]
- **Backup Operator**: [Backup Phone]

---

## Demo Day Timeline

| Time | Action | Responsible |
|------|--------|------------|
| 10:00 AM | Final system check | Ruth |
| 10:30 AM | Authorize Tesla | Ruth |
| 10:45 AM | Verify tracking active | Both |
| 11:00 AM | Manuel begins journey | Manuel |
| 11:15 AM | Monitor progress (5km) | Ruth |
| 11:30 AM | Prepare for arrival | Ruth |
| 11:40 AM | Vehicle arrives | Both |
| 11:45 AM | Demo complete | Both |

---

## Success Criteria

✅ **Authorization**: Tesla successfully connected to platform
✅ **Visibility**: Real-time location updates every 30 seconds
✅ **Navigation**: Destination sent to vehicle successfully
✅ **Tracking**: Complete journey tracked with all waypoints
✅ **Arrival**: Automatic detection within 100m of destination
✅ **Charging**: Wall Connector status shows ready
✅ **Payment**: Transaction processed successfully

---

## Notes for Investors

During the demo, investors will see:
1. **Seamless Tesla integration** using official OAuth
2. **Real-time tracking** with 30-second updates
3. **Premium host features** at destination
4. **Automated arrival detection**
5. **Instant payment processing**
6. **Professional dashboard interface**

This demonstrates our platform's ability to handle premium Tesla-equipped locations with enterprise-grade tracking and security.

---

## Emergency Fallback Plan

If technical issues arise:
1. **Primary**: Use live Tesla app screen sharing
2. **Secondary**: Pre-recorded demo video backup
3. **Tertiary**: PowerPoint with screenshots and walkthrough

Remember: The goal is to showcase the platform's capabilities and potential, not perfection. Stay calm and professional.

---

**Last Updated**: Demo Day Preparation
**Platform Status**: Production Ready at https://161.35.176.111
**Support Available**: Throughout demo window