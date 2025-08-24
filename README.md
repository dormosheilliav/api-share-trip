# api-share-trip
# Minimal Trip Share Email (Vercel Function + Resend)

פונקציית שרת יחידה לשליחת מייל שיתוף טיול דרך Resend.

## Deploy מהיר
1. העלה את הקבצים לריפו חדש ב-GitHub.
2. חבר את הריפו ל-Vercel (Add New Project).
3. הוסף ב-Project Settings → Environment Variables:
   - RESEND_API_KEY
   - FROM_EMAIL (למשל: Trip AI <onboarding@resend.dev> או מייל מדומיין מאומת)
   - API_SECRET (יישלח בכותרת X-API-KEY)
   - ALLOWED_ORIGINS (CORS, מופרדים בפסיק)
   - APP_BASE_URL (אופציונלי)
4. עשה Redeploy.

## קריאה לדוגמה
```bash
curl -X POST "https://<your-vercel-app>.vercel.app/api/share-trip" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: <API_SECRET>" \
  -d '{
    "to": "friend@example.com",
    "subject": "Family Trip to Athens",
    "tripTitle": "Athens Long Weekend",
    "tripId": "abc123",
    "message": "היי! מצרף את פרטי הטיול שלנו.",
    "summary": "3 לילות, מרכז אתונה, כולל אקרופוליס",
    "dates": "12–15 Sep 2025",
    "travelers": "2 Adults",
    "imageUrl": "https://.../athens.jpg"
  }'
