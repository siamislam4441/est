NOVA WEBSITE - SETUP (বাংলা)

১) Firebase Console-এ একটি project তৈরি করো।
২) Authentication > Sign-in method > Email/Password চালু করো।
৩) Firestore Database তৈরি করো।
৪) Firebase Project Settings > Your apps > Web app তৈরি করে config কপি করো।
৫) public/firebase-config.js ফাইলে PASTE_... জায়গাগুলো নিজের Firebase config দিয়ে বদলাও।
৬) Firestore Rules-এ firestore.rules ফাইলের নিয়মগুলো Publish করো।
৭) GitHub-এ পুরো my-website folder-এর ফাইলগুলো upload করো।
৮) Render > New > Web Service > GitHub repo connect করো।
   Build Command: npm install
   Start Command: npm start
৯) Deploy হলে Render URL-এ ওয়েবসাইট খুলবে।

লোকাল টেস্ট:
  npm install
  npm start
তারপর http://localhost:3000 খুলবে।

গুরুত্বপূর্ণ:
- Firebase config ওয়েব অ্যাপে দেখা যায়; নিরাপত্তা Firestore Rules দিয়ে হয়।
- প্রথম Admin account স্বয়ংক্রিয়ভাবে তৈরি হয় না। এই starter-এ Admin Panel/role system নেই।
- My files-এ upload এখনো চালু নয়; Firebase Storage আলাদা করে configure করতে হবে।
- Delete account-এর আগে current password দিয়ে পুনরায় পরিচয় নিশ্চিত করা হয়।
- এই starter-এ Google login, MFA, email change workflow, admin moderation এবং file upload এখনো যোগ করা হয়নি।
