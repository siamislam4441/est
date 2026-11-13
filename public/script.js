import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  deleteUser, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const authView = $("authView"), appView = $("appView"), pageContent = $("pageContent");
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
let currentUser = null, profile = {}, currentPage = "overview";

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}
function friendlyError(error) {
  const map = {
    "auth/email-already-in-use":"This email already has an account.",
    "auth/invalid-email":"Please enter a valid email.",
    "auth/weak-password":"Use a stronger password (at least 8 characters).",
    "auth/invalid-credential":"Email or password is incorrect.",
    "auth/too-many-requests":"Too many attempts. Please try again later.",
    "auth/requires-recent-login":"For security, sign in again and retry this action."
  };
  return map[error.code] || error.message || "Something went wrong.";
}
function initials(name="User") { return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function safe(value="") { return String(value).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function logActivity(action) {
  if (!currentUser) return;
  try { await addDoc(collection(db,"users",currentUser.uid,"activity"), { action, createdAt: serverTimestamp() }); } catch(e) { console.warn(e); }
}
async function loadProfile(user) {
  const ref = doc(db,"users",user.uid), snap = await getDoc(ref);
  if (!snap.exists()) {
    profile = { displayName:user.displayName || "User", email:user.email, bio:"", theme:"dark", language:"English", notifications:true, createdAt:serverTimestamp() };
    await setDoc(ref, profile);
  } else profile = snap.data();
}
function showApp(user) {
  currentUser=user; authView.classList.add("hidden"); appView.classList.remove("hidden");
  const name=profile.displayName || user.displayName || "User";
  $("sideName").textContent=name; $("sideEmail").textContent=user.email || "";
  $("sideAvatar").textContent=initials(name); $("topAvatar").textContent=initials(name);
  document.body.classList.toggle("light",profile.theme==="light");
  renderPage("overview");
}
function showAuth() { currentUser=null; appView.classList.add("hidden"); authView.classList.remove("hidden"); }
function selectAuth(tab) {
  document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
  $("loginForm").classList.toggle("hidden",tab!=="login");
  $("registerForm").classList.toggle("hidden",tab!=="register");
}
document.querySelectorAll("[data-auth-tab]").forEach(b=>b.addEventListener("click",()=>selectAuth(b.dataset.authTab)));
document.querySelectorAll("[data-toggle-password]").forEach(b=>b.addEventListener("click",()=>{
  const input=$(b.dataset.togglePassword); input.type=input.type==="password"?"text":"password"; b.textContent=input.type==="password"?"Show":"Hide";
}));
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); const b=e.submitter; b.disabled=true;
  try {
    await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);
    toast("Login successful.");
  } catch(err){toast(friendlyError(err));} finally{b.disabled=false;}
});
$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault(); const b=e.submitter; b.disabled=true;
  try {
    const name=$("registerName").value.trim(), email=$("registerEmail").value.trim();
    const cred=await createUserWithEmailAndPassword(auth,email,$("registerPassword").value);
    await updateProfile(cred.user,{displayName:name});
    await setDoc(doc(db,"users",cred.user.uid),{displayName:name,email,bio:"",theme:"dark",language:"English",notifications:true,createdAt:serverTimestamp()});
    await sendEmailVerification(cred.user); toast("Account created. Verification email sent.");
  } catch(err){toast(friendlyError(err));} finally{b.disabled=false;}
});
$("forgotBtn").addEventListener("click",async()=>{
  const email=$("loginEmail").value.trim(); if(!email)return toast("Enter your email address first.");
  try{await sendPasswordResetEmail(auth,email);toast("Password reset email sent.");}catch(e){toast(friendlyError(e));}
});
$("logoutBtn").addEventListener("click",async()=>{await logActivity("Signed out");await signOut(auth);showAuth();});
$("menuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("themeBtn").addEventListener("click",async()=>{
  profile.theme=document.body.classList.contains("light")?"dark":"light";
  document.body.classList.toggle("light",profile.theme==="light");
  try{await updateDoc(doc(db,"users",currentUser.uid),{theme:profile.theme});}catch(e){toast(friendlyError(e));}
});
$("notificationBtn").addEventListener("click",()=>toast("You are all caught up."));
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("sidebar").classList.remove("open");renderPage(b.dataset.page);}));
function pageHeader(title,desc){return `<h2 class="section-title">${title}</h2><p class="section-desc">${desc}</p>`;}
function renderPage(page) {
  currentPage=page;
  const titles={overview:"Overview",files:"My files",activity:"Activity",profile:"My profile",settings:"Settings",security:"Security"};
  $("pageHeading").textContent=titles[page]||"Overview";
  if(page==="overview"){
    const name=safe(profile.displayName||"there");
    pageContent.innerHTML=`<div class="welcome"><div><h1>Welcome back, ${name} ✨</h1><p>Here is what's happening in your workspace today.</p></div></div>
    <div class="stats"><div class="stat-card"><small>Account status</small><strong>Active</strong></div><div class="stat-card"><small>Email verified</small><strong>${currentUser.emailVerified?"Yes":"Pending"}</strong></div><div class="stat-card"><small>Workspace</small><strong>Personal</strong></div></div>
    <div class="dashboard-grid"><section class="panel"><h3>Quick access</h3><div class="quick-grid"><button class="quick" data-go="profile"><b>◎ My profile</b><small>Update your information</small></button><button class="quick" data-go="settings"><b>⚙ Preferences</b><small>Make it yours</small></button><button class="quick" data-go="security"><b>◇ Security</b><small>Protect your account</small></button><button class="quick" data-go="files"><b>▤ My files</b><small>Your file space</small></button></div></section><section class="panel"><h3>Account summary</h3><div class="row-item"><span>Name</span><span>${safe(profile.displayName||"—")}</span></div><div class="row-item"><span>Email</span><span>${safe(currentUser.email||"—")}</span></div><div class="row-item"><span>Theme</span><span>${safe(profile.theme||"dark")}</span></div><div class="row-item"><span>Notifications</span><span>${profile.notifications===false?"Off":"On"}</span></div></section></div>`;
    pageContent.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>renderPage(b.dataset.go)));
  } else if(page==="profile"){
    pageContent.innerHTML=`${pageHeader("My profile","Manage the information shown on your account.")}<section class="panel"><form id="profileForm"><label>Display name<input class="field-input" id="displayName" maxlength="50" required value="${safe(profile.displayName||"")}"></label><label>Email address<input class="field-input" value="${safe(currentUser.email||"")}" disabled></label><label>About me<textarea class="field-input" id="bio" maxlength="240" rows="4">${safe(profile.bio||"")}</textarea></label><button class="primary-btn" type="submit">Save profile</button></form></section>`;
    $("profileForm").addEventListener("submit",async e=>{e.preventDefault();const displayName=$("displayName").value.trim(),bio=$("bio").value.trim();try{await updateDoc(doc(db,"users",currentUser.uid),{displayName,bio});await updateProfile(currentUser,{displayName});profile={...profile,displayName,bio};$("sideName").textContent=displayName;$("sideAvatar").textContent=initials(displayName);$("topAvatar").textContent=initials(displayName);toast("Profile updated.");}catch(err){toast(friendlyError(err));}});
  } else if(page==="settings"){
    pageContent.innerHTML=`${pageHeader("Settings","Control your appearance and preferences.")}<div class="settings-list"><div class="setting-card"><h4>Appearance</h4><p>Choose a comfortable theme for your workspace.</p><button class="action-btn" id="themeChoice">Switch to ${profile.theme==="light"?"dark":"light"} mode</button></div><div class="setting-card"><h4>Notifications</h4><p>Choose whether to receive in-app notifications.</p><button class="action-btn" id="notifChoice">${profile.notifications===false?"Enable":"Disable"} notifications</button></div><div class="setting-card"><h4>Language</h4><p>Current language: ${safe(profile.language||"English")}. More languages can be added later.</p></div><div class="setting-card"><h4>Privacy</h4><p>Your account data is stored in your Firebase project. Review your database rules before launch.</p></div></div>`;
    $("themeChoice").onclick=()=> $("themeBtn").click();
    $("notifChoice").onclick=async()=>{profile.notifications=profile.notifications===false;try{await updateDoc(doc(db,"users",currentUser.uid),{notifications:profile.notifications});renderPage("settings");toast("Preference saved.");}catch(e){toast(friendlyError(e));}};
  } else if(page==="security"){
    pageContent.innerHTML=`${pageHeader("Security","Keep your account protected.")}<section class="panel"><h3>Email verification</h3><p class="muted">${currentUser.emailVerified?"Your email is verified.":"Your email is not verified yet."}</p>${currentUser.emailVerified?"":'<button class="action-btn" id="verifyBtn">Send verification email</button>'}</section><section class="panel"><h3>Change password</h3><form id="passwordForm"><label>Current password<input class="field-input" id="oldPassword" type="password" required></label><label>New password<input class="field-input" id="newPassword" type="password" minlength="8" required></label><button class="action-btn" type="submit">Update password</button></form></section><section class="panel"><h3>Delete account</h3><p class="muted">This permanently deletes your Firebase login and profile document. This action cannot be undone. You must enter your current password again.</p><button class="danger-btn" id="deleteAccountBtn">Permanently delete my account</button></section>`;
    if($("verifyBtn"))$("verifyBtn").onclick=async()=>{try{await sendEmailVerification(currentUser);toast("Verification email sent.");}catch(e){toast(friendlyError(e));}};
    $("passwordForm").onsubmit=async e=>{e.preventDefault();try{const credential=EmailAuthProvider.credential(currentUser.email,$("oldPassword").value);await reauthenticateWithCredential(currentUser,credential);await updatePassword(currentUser,$("newPassword").value);toast("Password updated.");$("passwordForm").reset();}catch(err){toast(friendlyError(err));}};
    $("deleteAccountBtn").onclick=async()=>{const confirmed=prompt('To permanently delete your account, type DELETE');if(confirmed!=="DELETE")return toast("Account deletion cancelled.");const password=prompt("Enter your current password to confirm");if(!password)return;try{const credential=EmailAuthProvider.credential(currentUser.email,password);await reauthenticateWithCredential(currentUser,credential);await deleteDoc(doc(db,"users",currentUser.uid));await deleteUser(currentUser);showAuth();toast("Account deleted.");}catch(err){toast(friendlyError(err));}};
  } else if(page==="files"){
    pageContent.innerHTML=`${pageHeader("My files","Your private file area. File upload is not enabled in this starter build.")}<section class="panel"><h3>File storage</h3><p class="muted">Connect Firebase Storage and add storage security rules to enable private uploads and downloads.</p></section>`;
  } else if(page==="activity"){
    pageContent.innerHTML=`${pageHeader("Recent activity","A record of actions saved to your account.")}<section class="panel" id="activityList">Loading activity…</section>`;
    getDocs(query(collection(db,"users",currentUser.uid,"activity"),orderBy("createdAt","desc"),limit(20))).then(snap=>{$("activityList").innerHTML=snap.empty?'<p class="muted">No activity yet.</p>':snap.docs.map(d=>`<div class="row-item"><span>${safe(d.data().action)}</span><span>${d.data().createdAt?.toDate?.().toLocaleString()||"Just now"}</span></div>`).join("");}).catch(e=>{$("activityList").textContent=friendlyError(e);});
  }
}
onAuthStateChanged(auth,async user=>{
  if(!user){showAuth();return;}
  try{await loadProfile(user);showApp(user);await logActivity("Signed in");}
  catch(e){toast("Could not load account data. Check Firebase setup and rules.");console.error(e);}
});
