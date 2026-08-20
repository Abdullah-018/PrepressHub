import { supabase, config, isConfigured, publicFileUrl } from './appwrite.js?v=2.0.13';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const app = $('#app');
const authActions = $('#authActions');
const authModal = $('#authModal');
const authModalContent = $('#authModalContent');
const genericModal = $('#genericModal');
const genericModalContent = $('#genericModalContent');
const toast = $('#toast');
let ratingRotationTimer = null;
function loadGuestSession(){try{return JSON.parse(sessionStorage.getItem('prepresshub_guest')||'null');}catch{return null;}}

const state = {
  lang: localStorage.getItem('prepresshub_lang') || 'bn',
  session: null,
  user: null,
  profile: null,
  privateProfile: null,
  company: null,
  guest: loadGuestSession(),
  pendingGuestReviewCompanyId: null,
  route: 'home'
};

const T = {
  bn: {
    home:'হোম',companies:'কোম্পানি',professionals:'প্রফেশনাল',jobs:'চাকরি',advertise:'বিজ্ঞাপন',platform:'প্ল্যাটফর্ম',community:'কমিউনিটি',account:'অ্যাকাউন্ট',myProfile:'আমার প্রোফাইল',editProfile:'প্রোফাইল এডিট করুন',admin:'অ্যাডমিন',adminLabel:'অ্যাডমিন আইডি',adminLogin:'অ্যাডমিন লগইন',adminAccess:'অ্যাডমিন প্রবেশ',adminSwitchNotice:'অ্যাডমিন হিসেবে প্রবেশ করলে বর্তমানে লগইন করা ইউজার বা কোম্পানি অ্যাকাউন্টটি লগআউট হবে।',adminVerificationFailed:'অ্যাডমিন অ্যাকাউন্ট যাচাই করা যায়নি।',adminEmailMissing:'config.js ফাইলে ADMIN_EMAIL দেওয়া নেই।',editAdminProfile:'অ্যাডমিন প্রোফাইল এডিট করুন',reviewGuidelines:'রিভিউ গাইডলাইন',privacy:'প্রাইভেসি',footerText:'বাংলাদেশের garment accessories ও prepress professionals-এর career intelligence platform।',skipToContent:'মূল কনটেন্টে যান',
    login:'লগইন',signup:'সাইনআপ',guestLogin:'গেস্ট প্রবেশ',guestLogout:'গেস্ট থেকে বের হন',guestReviewer:'গেস্ট রিভিউয়ার',logout:'লগআউট',loading:'লোড হচ্ছে…',save:'সেভ করুন',cancel:'বাতিল',search:'সার্চ করুন',view:'দেখুন',previewCv:'CV প্রিভিউ',noDownload:'CV শুধু প্রিভিউ করা যাবে। ডাউনলোড বাটন দেওয়া হয়নি।',pending:'পেন্ডিং',approved:'অনুমোদিত',rejected:'বাতিল',banned:'ব্যান',verifiedCompanyEmail:'ভেরিফায়েড কোম্পানি ইমেইল',yes:'হ্যাঁ',no:'না',
    heroEyebrow:'বাংলাদেশের প্রি-প্রেস ক্যারিয়ার নেটওয়ার্ক',heroTitle:'সঠিক কোম্পানি বেছে নিন, <em>বাস্তব কর্মপরিবেশ</em> আগেই জানুন',heroText:'কোম্পানি রিভিউ, টিম লিডার রেটিং, পেশাজীবী প্রোফাইল, চাকরি এবং শিল্পসংশ্লিষ্ট বিজ্ঞাপন—সব এক জায়গায়।',browseCompanies:'কোম্পানি দেখুন',createProfile:'প্রোফাইল তৈরি করুন',searchPlaceholder:'কোম্পানি বা প্রফেশনাল সার্চ করুন',approvedProfiles:'অনুমোদিত প্রোফাইল',approvedCompanies:'অনুমোদিত কোম্পানি',openJobs:'চলমান চাকরি',approvedReviews:'অনুমোদিত রিভিউ',
    featuredCompanies:'ফিচারড কোম্পানি',latestProfessionals:'নতুন প্রফেশনাল',latestJobs:'সাম্প্রতিক চাকরি',noData:'এখনো কোনো তথ্য নেই।',employeeCount:'নিবন্ধিত কর্মী',reviews:'রিভিউ',location:'লোকেশন',teamLead:'টিম লিডার',nightShift:'নাইট শিফট',salary:'সেলারি',designation:'ডেজিগনেশন',description:'বিস্তারিত',postJob:'চাকরি পোস্ট করুন',deadline:'আবেদনের শেষ তারিখ',applyEmail:'আবেদনের ইমেইল',whatsapp:'হোয়াটসঅ্যাপ নম্বর',applyNow:'এখনই আবেদন করুন',applicationsClosed:'আবেদনের সময় শেষ',addCompany:'নতুন কোম্পানি যোগ করুন',submitAd:'বিজ্ঞাপন জমা দিন',
    professionalSignup:'ইউজার সাইনআপ',companySignup:'কোম্পানি সাইনআপ',email:'ইমেইল',password:'পাসওয়ার্ড',fullName:'পূর্ণ নাম',phone:'ফোন',currentCompany:'বর্তমান কোম্পানি',currentCompanyLocation:'বর্তমান কোম্পানির লোকেশন',currentDesignation:'বর্তমান ডেজিগনেশন',uploadCv:'CV আপলোড',profilePhoto:'প্রোফাইল ছবি',uploadPhoto:'প্রোফাইল ছবি আপলোড',removePhoto:'বর্তমান প্রোফাইল ছবি ডিলিট করুন',photoHelp:'JPG, PNG বা WebP; সর্বোচ্চ ৩ MB।',companyName:'কোম্পানির নাম',companyLocation:'কোম্পানির লোকেশন',capacityMin:'সর্বনিম্ন কর্মী ধারণক্ষমতা',capacityMax:'সর্বোচ্চ কর্মী ধারণক্ষমতা',compliance:'কমপ্লায়েন্স আছে',providentFund:'প্রভিডেন্ট ফান্ড আছে',salaryFrom:'সেলারি দেয় শুরু তারিখ',salaryTo:'সেলারি দেয় শেষ তারিখ',overtimePaid:'ওভারটাইম পরিশোধ করে',weeklyHoliday:'সাপ্তাহিক ছুটি',festivalBonus:'ফেস্টিভ্যাল বোনাস',transport:'ট্রান্সপোর্ট',canteen:'ক্যান্টিন',website:'ওয়েবসাইট',officialDomain:'অফিসিয়াল ইমেইল ডোমেইন',proof:'কোম্পানি প্রমাণপত্র',contactPerson:'যোগাযোগ ব্যক্তি',signUpSubmit:'আবেদন জমা দিন',
    emailConfirm:'আপনার ইমেইলে verification link পাঠানো হয়েছে। লিংকে ক্লিক করে লগইন করুন।',signupPending:'অ্যাকাউন্ট তৈরি হয়েছে। কোম্পানি তথ্য প্রকাশের আগে শুধু কোম্পানি verification প্রয়োজন হবে।',loginFailed:'লগইন ব্যর্থ হয়েছে।',notApproved:'কোম্পানিটি এখনো অনুমোদিত নয়।',profileCompletion:'প্রোফাইল কমপ্লিশন',skills:'স্কিল',bio:'পরিচিতি',portfolio:'পোর্টফোলিও (ঐচ্ছিক)',previousExperience:'পূর্বের চাকরির অভিজ্ঞতা',addExperience:'আরেকটি কোম্পানি যোগ করুন',employmentHistory:'কোম্পানি ও চাকরির ইতিহাস',from:'শুরু',to:'শেষ',presentRole:'বর্তমান দায়িত্ব',careerHistory:'ক্যারিয়ার ইতিহাস',
    companyDirectory:'কোম্পানি ডিরেক্টরি',professionalDirectory:'প্রফেশনাল ডিরেক্টরি',jobPortal:'চাকরি পোর্টাল',adDirectory:'বিজ্ঞাপন ডিরেক্টরি',writeReview:'রিভিউ দিন',postBy:'পোস্ট করেছেন',realJobWarning:'শুধু বাস্তব চাকরির বিজ্ঞপ্তি পোস্ট করুন। ফেক জব প্রমাণিত হলে অ্যাকাউন্ট ব্যান করা হবে।',truthConfirm:'তথ্যটি বাস্তব এবং সঠিক—আমি নিশ্চিত করছি।',reviewPending:'রিভিউ অ্যাডমিন অনুমোদনের জন্য জমা হয়েছে।',jobPending:'চাকরির পোস্ট অ্যাডমিন অনুমোদনের জন্য জমা হয়েছে।',adPending:'বিজ্ঞাপন অ্যাডমিন অনুমোদনের জন্য জমা হয়েছে।',
    adminDashboard:'অ্যাডমিন ড্যাশবোর্ড',users:'ইউজার',claims:'কোম্পানি ক্লেইম',actions:'অ্যাকশন',approve:'এপ্রুভ',reject:'ডিক্লাইন',delete:'ডিলিট',ban:'ব্যান',unban:'আনব্যান',editCompanyInfo:'কোম্পানি তথ্য এডিট',mergeCompanies:'ডুপ্লিকেট কোম্পানি মার্জ',sourceCompany:'সোর্স কোম্পানি',targetCompany:'টার্গেট কোম্পানি',merge:'মার্জ করুন',status:'স্ট্যাটাস',created:'তৈরির সময়',possibleDuplicate:'সম্ভাব্য ডুপ্লিকেট',
    configMissing:'Appwrite configuration এখনো দেওয়া হয়নি। config.js ফাইলে Endpoint ও Project ID বসান।',setupRequired:'সেটআপ প্রয়োজন',error:'কিছু সমস্যা হয়েছে।',success:'সফল হয়েছে।',anonymous:'নাম গোপন',formerEmployee:'সাবেক কর্মী',currentEmployee:'বর্তমান কর্মী',salaryBenefits:'বেতন ও সুবিধা',workEnvironment:'কাজের পরিবেশ',management:'ম্যানেজমেন্ট',careerGrowth:'ক্যারিয়ার উন্নয়ন',workLife:'Work-life balance',teamLeadRating:'টিম লিডার রেটিং',pros:'ভালো দিক',cons:'উন্নতির জায়গা',advice:'পরামর্শ',submitReview:'রিভিউ জমা দিন',
    adTitle:'বিজ্ঞাপনের শিরোনাম',advertiser:'বিজ্ঞাপনদাতা',targetUrl:'গন্তব্য লিংক',banner:'ব্যানার ছবি',placement:'প্লেসমেন্ট',homepage:'হোমপেজ',directory:'ডিরেক্টরি',companyPage:'কোম্পানি পেজ',submit:'জমা দিন',publicNotice:'Public page-এ শুধু approved তথ্য দেখা যাবে।',
    profileSaved:'প্রোফাইল আপডেট হয়েছে।',companySaved:'কোম্পানি প্রোফাইল আপডেট হয়েছে।',fileUploadFailed:'ফাইল আপলোড ব্যর্থ হয়েছে।',loginRequired:'এই কাজের জন্য লগইন করুন।',approvedRequired:'এই কাজের জন্য approved account প্রয়োজন।',adminOnly:'শুধু অ্যাডমিন এই পেজ দেখতে পারবে।'
  },
  en: {
    home:'Home',companies:'Companies',professionals:'Professionals',jobs:'Jobs',advertise:'Advertise',platform:'Platform',community:'Community',account:'Account',myProfile:'My profile',editProfile:'Edit profile',admin:'Admin',adminLabel:'Administrator',adminLogin:'Admin login',adminAccess:'Administrator access',adminSwitchNotice:'Signing in as administrator will log out the currently active user or company account.',adminVerificationFailed:'The administrator account could not be verified.',adminEmailMissing:'ADMIN_EMAIL is missing from config.js.',editAdminProfile:'Edit administrator profile',reviewGuidelines:'Review guidelines',privacy:'Privacy',footerText:'Bangladesh’s career intelligence platform for garment-accessories and prepress professionals.',skipToContent:'Skip to main content',
    login:'Login',signup:'Sign up',guestLogin:'Continue as guest',guestLogout:'Exit guest',guestReviewer:'Guest reviewer',logout:'Logout',loading:'Loading…',save:'Save',cancel:'Cancel',search:'Search',view:'View',previewCv:'Preview CV',noDownload:'The CV is available for preview only. No download button is provided.',pending:'Pending',approved:'Approved',rejected:'Rejected',banned:'Banned',verifiedCompanyEmail:'Verified company email',yes:'Yes',no:'No',
    heroEyebrow:'Bangladesh prepress career network',heroTitle:'Choose the right company and know the <em>real workplace</em> first',heroText:'Company reviews, named team-lead ratings, professional profiles, jobs and industry advertising in one platform.',browseCompanies:'Browse companies',createProfile:'Create profile',searchPlaceholder:'Search company or professional',approvedProfiles:'Approved profiles',approvedCompanies:'Approved companies',openJobs:'Open jobs',approvedReviews:'Approved reviews',
    featuredCompanies:'Featured companies',latestProfessionals:'New professionals',latestJobs:'Latest jobs',noData:'No information is available yet.',employeeCount:'Registered employees',reviews:'Reviews',location:'Location',teamLead:'Team lead',nightShift:'Night shift',salary:'Salary',designation:'Designation',description:'Description',postJob:'Post a job',deadline:'Application deadline',applyEmail:'Application email',whatsapp:'WhatsApp number',applyNow:'Apply now',applicationsClosed:'Applications closed',addCompany:'Add new company',submitAd:'Submit advertisement',
    professionalSignup:'User signup',companySignup:'Company signup',email:'Email',password:'Password',fullName:'Full name',phone:'Phone',currentCompany:'Current company',currentCompanyLocation:'Current company location',currentDesignation:'Current designation',uploadCv:'Upload CV',profilePhoto:'Profile photo',uploadPhoto:'Upload profile photo',removePhoto:'Delete the current profile photo',photoHelp:'JPG, PNG or WebP; maximum 3 MB.',companyName:'Company name',companyLocation:'Company location',capacityMin:'Minimum worker capacity',capacityMax:'Maximum worker capacity',compliance:'Compliance available',providentFund:'Provident fund available',salaryFrom:'Salary payment starts on',salaryTo:'Salary payment ends on',overtimePaid:'Overtime is paid',weeklyHoliday:'Weekly holiday',festivalBonus:'Festival bonus',transport:'Transport',canteen:'Canteen',website:'Website',officialDomain:'Official email domain',proof:'Company proof document',contactPerson:'Contact person',signUpSubmit:'Submit application',
    emailConfirm:'A verification link was sent to your email. Open it and sign in.',signupPending:'Your account is ready. Only company information requires verification before publication.',loginFailed:'Login failed.',notApproved:'This company is not approved yet.',profileCompletion:'Profile completion',skills:'Skills',bio:'Bio',portfolio:'Portfolio (optional)',previousExperience:'Previous experience',addExperience:'Add another company',employmentHistory:'Company and employment history',from:'From',to:'To',presentRole:'Present role',careerHistory:'Career history',
    companyDirectory:'Company directory',professionalDirectory:'Professional directory',jobPortal:'Job portal',adDirectory:'Advertisement directory',writeReview:'Write review',postBy:'Posted by',realJobWarning:'Post only genuine job circulars. If a fake job is proven, the account will be banned.',truthConfirm:'I confirm that the information is genuine and accurate.',reviewPending:'The review was submitted for administrator approval.',jobPending:'The job was submitted for administrator approval.',adPending:'The advertisement was submitted for administrator approval.',
    adminDashboard:'Admin dashboard',users:'Users',claims:'Company claims',actions:'Actions',approve:'Approve',reject:'Reject',delete:'Delete',ban:'Ban',unban:'Unban',editCompanyInfo:'Edit company information',mergeCompanies:'Merge duplicate companies',sourceCompany:'Source company',targetCompany:'Target company',merge:'Merge',status:'Status',created:'Created',possibleDuplicate:'Possible duplicate',
    configMissing:'Appwrite is not configured. Put the Endpoint and Project ID in config.js.',setupRequired:'Setup required',error:'Something went wrong.',success:'Completed successfully.',anonymous:'Anonymous',formerEmployee:'Former employee',currentEmployee:'Current employee',salaryBenefits:'Salary & benefits',workEnvironment:'Work environment',management:'Management',careerGrowth:'Career growth',workLife:'Work-life balance',teamLeadRating:'Team-lead rating',pros:'Pros',cons:'Areas to improve',advice:'Advice',submitReview:'Submit review',
    adTitle:'Advertisement title',advertiser:'Advertiser',targetUrl:'Destination link',banner:'Banner image',placement:'Placement',homepage:'Homepage',directory:'Directory',companyPage:'Company page',submit:'Submit',publicNotice:'Only approved information is shown publicly.',
    profileSaved:'Profile updated.',companySaved:'Company profile updated.',fileUploadFailed:'File upload failed.',loginRequired:'Please log in for this action.',approvedRequired:'An approved account is required for this action.',adminOnly:'Only the administrator can access this page.'
  }
};

function t(key){ return T[state.lang]?.[key] ?? T.en[key] ?? key; }
function esc(value=''){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function nl2br(value=''){ return esc(value).replace(/\n/g,'<br>'); }
function initials(name='PH'){ return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'PH'; }
function number(value){ return Number(value || 0); }
function formatDate(value){ if(!value) return '—'; return new Intl.DateTimeFormat(state.lang==='bn'?'bn-BD':'en-GB',{dateStyle:'medium'}).format(new Date(value)); }
function statusBadge(status){ return `<span class="badge ${esc(status)}">${esc(t(status) || status)}</span>`; }
function companyEmailBadge(profile){ return profile?.company_email_verified ? `<span class="badge company-email">✓ ${esc(t('verifiedCompanyEmail'))}</span>` : ''; }
function adminBadge(profile){ return profile?.role==='admin' ? `<span class="badge admin-badge">★ ${esc(t('adminLabel'))}</span>` : ''; }
function avatarMarkup(profile,name,className='avatar round'){
  const label=name||profile?.full_name||'PrepressHub';
  const image=profile?.avatar_path?publicFileUrl(profile.avatar_path):'';
  return `<div class="${esc(className)}${image?' has-image':''}">${image?`<img src="${esc(image)}" alt="${esc(label)}">`:esc(initials(label))}</div>`;
}
function yesNo(value){ return esc(t(value?'yes':'no')); }
function showToast(message, type='success'){
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>toast.className='toast',3500);
}
function openModal(dialog, html){
  if(dialog===authModal) authModalContent.innerHTML = html; else genericModalContent.innerHTML = html;
  dialog.showModal();
}
function closeModal(dialog){ if(dialog?.open) dialog.close(); }
function requireLogin(){ if(!state.user){ showToast(t('loginRequired'),'error'); openAuth('login'); return false; } return true; }
function requireApproved(){ if(!requireLogin()) return false; if(state.profile?.status!=='approved' && state.profile?.role!=='admin'){ showToast(t('approvedRequired'),'error'); return false; } return true; }

function routeInfo(){
  const raw=(location.hash||'#home').slice(1);
  const [name,query='']=raw.split('?');
  return {name:name||'home', params:new URLSearchParams(query)};
}
function setLanguage(lang){
  state.lang=lang;localStorage.setItem('prepresshub_lang',lang);document.body.dataset.lang=lang;document.documentElement.lang=lang;$('#languageButton').textContent=lang==='bn'?'EN':'BN';applyStaticTranslations();renderAuthActions();renderRoute();
}
function applyStaticTranslations(){ $$('[data-i18n]').forEach(el=>{ const key=el.dataset.i18n;if(T[state.lang][key]) el.textContent=t(key); }); }

async function refreshAuth(){
  if(!supabase) return;
  const {data:{session}}=await supabase.auth.getSession();
  state.session=session;state.user=session?.user||null;state.profile=null;state.privateProfile=null;state.company=null;
  if(state.user){
    await completePendingUpload();
    const [{data:profile},{data:privateProfile}]=await Promise.all([
      supabase.from('profiles').select('*').eq('id',state.user.id).maybeSingle(),
      supabase.from('profile_private').select('phone,cv_path').eq('id',state.user.id).maybeSingle()
    ]);
    state.privateProfile=privateProfile||null;
    let currentProfile=profile;
    if(currentProfile&&currentProfile.role!=='admin'&&(!currentProfile.company_id||!currentProfile.company_email_verified)){
      try{
        await rpc('sync_company_email_badge',{p_user_id:state.user.id});
        const {data:syncedProfile}=await supabase.from('profiles').select('*').eq('id',state.user.id).maybeSingle();
        currentProfile=syncedProfile||currentProfile;
      }catch(syncError){console.warn('Company email badge sync skipped:',syncError.message||syncError);}
    }
    state.profile=currentProfile?{...currentProfile,phone:privateProfile?.phone||'',cv_path:privateProfile?.cv_path||null}:null;
    const configuredAdminEmail=String(config.ADMIN_EMAIL||'').trim().toLowerCase();
    const authenticatedEmail=String(state.user.email||'').trim().toLowerCase();
    if(configuredAdminEmail && authenticatedEmail===configuredAdminEmail){
      state.profile={
        ...(state.profile||{}),
        id:state.user.id,
        full_name:state.profile?.full_name||state.user.name||state.user.email,
        phone:privateProfile?.phone||state.profile?.phone||'',
        cv_path:privateProfile?.cv_path||state.profile?.cv_path||null,
        role:'admin',
        status:'approved'
      };
    }
    if(state.profile?.company_id){ const {data:company}=await supabase.from('companies').select('*').eq('id',state.profile.company_id).maybeSingle();state.company=company||null; }
  }
  renderAuthActions();
}
function renderAuthActions(){
  if(!isConfigured){authActions.innerHTML=`<span class="badge pending">${esc(t('setupRequired'))}</span>`;return;}
  if(!state.user){
    if(state.guest){authActions.innerHTML=`<span class="badge verified">${esc(t('guestReviewer'))}: ${esc(state.guest.name)}</span><button class="button dark small" data-guest-logout>${esc(t('guestLogout'))}</button>`;return;}
    authActions.innerHTML=`<button class="button ghost small" data-auth="login">${esc(t('login'))}</button><button class="button primary small" data-auth="signup">${esc(t('signup'))}</button><button class="button dark small" data-guest-login>${esc(t('guestLogin'))}</button>`;return;
  }
  const label=state.profile?.full_name||state.user.email;
  const isAdmin=state.profile?.role==='admin';
  authActions.innerHTML=`<a class="button ghost small${isAdmin?' admin-account-link':''}" href="#${isAdmin?'admin':'account'}">${isAdmin?'★ ':''}${esc(isAdmin?`${t('admin')} · ${label}`:label)}</a><button class="button dark small" data-logout>${esc(t('logout'))}</button>`;
}

async function query(table, options={}){
  let q=supabase.from(table).select(options.select||'*');
  if(options.eq) for(const [key,value] of Object.entries(options.eq)) q=q.eq(key,value);
  if(options.order) q=q.order(options.order.column,{ascending:options.order.ascending??false});
  if(options.limit) q=q.limit(options.limit);
  const {data,error}=await q;if(error) throw error;return data||[];
}
async function rpc(name,args={}){ const {data,error}=await supabase.rpc(name,args);if(error) throw error;return data; }

function notConfiguredPage(){
  return `<section class="page-hero"><div class="container"><div class="notice danger"><strong>${esc(t('configMissing'))}</strong><p>Open <code>config.js</code>, paste the Appwrite Endpoint and Project ID, then reload.</p></div></div></section>`;
}

async function renderRoute(){
  clearInterval(ratingRotationTimer);ratingRotationTimer=null;
  const info=routeInfo();state.route=info.name;$$('.desktop-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${info.name}`));
  if(info.name==='privacy'){renderPrivacy();applyStaticTranslations();return;}
  if(info.name==='review-guidelines'){renderReviewGuidelines();applyStaticTranslations();return;}
  if(!isConfigured){app.innerHTML=notConfiguredPage();return;}
  app.innerHTML=`<div class="page-loader"><span></span><p>${esc(t('loading'))}</p></div>`;
  try{
    if(info.name==='home') await renderHome();
    else if(info.name==='companies') await renderCompanies();
    else if(info.name==='company') await renderCompany(info.params.get('id'));
    else if(info.name==='professionals') await renderProfessionals();
    else if(info.name==='professional') await renderProfessional(info.params.get('id'));
    else if(info.name==='jobs') await renderJobs();
    else if(info.name==='advertise') await renderAdvertisements();
    else if(info.name==='account') await renderAccount();
    else if(info.name==='admin-login') renderAdminLoginPage();
    else if(info.name==='admin') await renderAdmin();
    else await renderHome();
  }catch(error){ console.error(error);app.innerHTML=`<section class="page-hero"><div class="container"><div class="notice danger"><strong>${esc(t('error'))}</strong><p>${esc(error.message||error)}</p></div></div></section>`; }
  await refreshLiveJobBadge();
  applyStaticTranslations();
}

function renderAdminLoginPage(){
  if(state.profile?.role==='admin'){location.hash='#admin';return;}
  const adminEmail=String(config.ADMIN_EMAIL||'').trim().toLowerCase();
  app.innerHTML=`<section class="page-hero admin-login-page"><div class="container"><div class="admin-login-card"><div class="admin-login-mark">A</div><span class="eyebrow">${esc(t('adminAccess'))}</span><h1>${esc(t('adminLogin'))}</h1><p>${esc(t('adminSwitchNotice'))}</p><form id="adminLoginForm"><div class="form-grid"><label class="field full"><span>${esc(t('email'))}</span><input type="email" name="email" value="${esc(adminEmail)}" readonly required></label><label class="field full"><span>${esc(t('password'))}</span><input type="password" name="password" required minlength="8" autocomplete="current-password"></label></div><div class="form-actions"><button class="button primary full" type="submit">${esc(t('adminLogin'))}</button></div></form></div></div></section>`;
}

function renderPrivacy(){
  const bn=state.lang==='bn';
  app.innerHTML=`<section class="page-hero"><div class="container"><span class="eyebrow">Privacy & safety</span><h1>${bn?'প্রাইভেসি নীতি':'Privacy policy'}</h1><p>${bn?'PrepressHub-এ জমা দেওয়া ব্যক্তিগত ও পেশাগত তথ্য কীভাবে ব্যবহৃত হয় তার সংক্ষিপ্ত নীতি।':'How personal and professional information submitted to PrepressHub is handled.'}</p></div></section><section class="section soft"><div class="container grid-2"><article class="detail-card"><h2>${bn?'আমরা যে তথ্য রাখি':'Information we store'}</h2><p>${bn?'নাম, ইমেইল, ফোন, লোকেশন, কর্ম-ইতিহাস, CV, কোম্পানি যাচাইকরণ নথি এবং জমা দেওয়া কনটেন্ট রাখা হতে পারে। গেস্ট রিভিউ যাচাই ও অপব্যবহার নিয়ন্ত্রণের জন্য গেস্ট নাম ও ইমেইল সংরক্ষিত হয়।':'We may store names, email addresses, phone numbers, locations, employment history, CVs, company-verification documents and submitted content. Guest names and emails are retained for moderation and abuse prevention.'}</p></article><article class="detail-card"><h2>${bn?'অ্যাক্সেস ও দৃশ্যমানতা':'Access and visibility'}</h2><p>${bn?'ফোন, CV path, গেস্ট ইমেইল ও কোম্পানি প্রমাণপত্র private থাকে। অনুমোদিত ব্যবহারকারী CV preview করতে পারে; administrator moderation-এর জন্য private records দেখতে পারে।':'Phone numbers, CV paths, guest emails and company proof documents remain private. Approved users may preview CVs, while administrators may access private records for moderation.'}</p></article><article class="detail-card"><h2>${bn?'ব্যবহারের উদ্দেশ্য':'Purpose of use'}</h2><p>${bn?'তথ্য account verification, professional directory, company review, job ও advertisement moderation এবং platform security-এর জন্য ব্যবহার করা হয়।':'Information is used for account verification, the professional directory, company reviews, job and advertisement moderation, and platform security.'}</p></article><article class="detail-card"><h2>${bn?'নিয়ন্ত্রণ ও যোগাযোগ':'Your control'}</h2><p>${bn?'তথ্য সংশোধন বা account মুছে ফেলার অনুরোধ administrator-কে জানান। Production launch-এর আগে প্রতিষ্ঠানের যোগাযোগ ঠিকানা ও retention period এখানে যোগ করতে হবে।':'Contact the administrator to request correction or account deletion. Add the organisation contact address and retention periods here before production launch.'}</p></article></div></section>`;
}

function renderReviewGuidelines(){
  const bn=state.lang==='bn';
  app.innerHTML=`<section class="page-hero"><div class="container"><span class="eyebrow">Fair & useful reviews</span><h1>${bn?'রিভিউ গাইডলাইন':'Review guidelines'}</h1><p>${bn?'সত্য, প্রাসঙ্গিক এবং নিরাপদ কর্মপরিবেশের তথ্য শেয়ার করুন।':'Share truthful, relevant and safe workplace information.'}</p></div></section><section class="section soft"><div class="container grid-2"><article class="detail-card"><h2>${bn?'নিজের অভিজ্ঞতা লিখুন':'Use first-hand experience'}</h2><p>${bn?'শুধু নিজের বর্তমান বা পূর্বের চাকরির অভিজ্ঞতা লিখুন। অনুমান, গুজব বা অন্যের ব্যক্তিগত অভিযোগ ব্যবহার করবেন না।':'Write only about your own current or former employment. Do not submit rumours, speculation or another person’s private complaint.'}</p></article><article class="detail-card"><h2>${bn?'ব্যক্তিগত তথ্য দেবেন না':'Protect personal information'}</h2><p>${bn?'ফোন নম্বর, ঠিকানা, জাতীয় পরিচয়পত্র, ব্যক্তিগত ইমেইল বা গোপন ব্যবসায়িক তথ্য প্রকাশ করবেন না।':'Do not publish phone numbers, addresses, identity numbers, personal email addresses or confidential business information.'}</p></article><article class="detail-card"><h2>${bn?'সম্মানজনক ভাষা':'Be respectful'}</h2><p>${bn?'হুমকি, ঘৃণামূলক বক্তব্য, অশ্লীলতা বা প্রমাণহীন অপরাধের অভিযোগ গ্রহণযোগ্য নয়।':'Threats, hate speech, obscenity and unsupported allegations of criminal conduct are not permitted.'}</p></article><article class="detail-card"><h2>${bn?'Moderation ও আপিল':'Moderation and appeals'}</h2><p>${bn?'সব রিভিউ প্রকাশের আগে পরীক্ষা করা হয়। বিভ্রান্তিকর বা নীতিবিরুদ্ধ কনটেন্ট বাতিল বা অপসারণ করা হতে পারে; production launch-এর আগে appeal contact যোগ করুন।':'Reviews are checked before publication. Misleading or policy-violating content may be rejected or removed; add an appeal contact before production launch.'}</p></article></div></section>`;
}

async function homeStats(){
  const [profiles,companies,jobs,reviews]=await Promise.all([
    supabase.from('profiles').select('*',{count:'exact',head:true}).eq('status','approved').eq('account_type','professional'),
    supabase.from('companies').select('*',{count:'exact',head:true}).eq('status','approved'),
    supabase.from('jobs').select('*').eq('status','approved'),
    supabase.from('review_feed').select('*',{count:'exact',head:true})
  ]);
  return {profiles:profiles.count||0,companies:companies.count||0,jobs:(jobs.data||[]).filter(job=>!isJobExpired(job)).length,reviews:reviews.count||0};
}
async function companyCards(limit=6){
  const companies=await query('companies',{eq:{status:'approved'},order:{column:'created_at'},limit});
  if(!companies.length)return [];
  const ids=companies.map(c=>c.id);
  const [{data:reviews},{data:employment}]=await Promise.all([
    supabase.from('review_feed').select('company_id,overall_rating,team_lead_rating,salary_benefits,work_environment,management,career_growth,work_life_balance').in('company_id',ids),
    supabase.from('employment_history').select('company_id,user_id').in('company_id',ids).eq('is_current',true)
  ]);
  return companies.map(c=>{
    const rs=(reviews||[]).filter(r=>r.company_id===c.id), em=(employment||[]).filter(e=>e.company_id===c.id);
    const avg=rs.length?rs.reduce((a,r)=>a+number(r.overall_rating),0)/rs.length:0;
    const categoryAverage=(key)=>rs.length?rs.reduce((sum,row)=>sum+number(row[key]),0)/rs.length:0;
    return {...c,rating:avg,teamLead:categoryAverage('team_lead_rating'),salaryBenefits:categoryAverage('salary_benefits'),workEnvironment:categoryAverage('work_environment'),managementRating:categoryAverage('management'),careerGrowth:categoryAverage('career_growth'),workLife:categoryAverage('work_life_balance'),reviewCount:rs.length,employeeCount:new Set(em.map(e=>e.user_id)).size};
  });
}
async function professionalCards(limit=6){
  const profiles=await query('profiles',{eq:{status:'approved',account_type:'professional'},order:{column:'created_at'},limit});
  if(!profiles.length)return [];
  const ids=profiles.map(p=>p.id);
  const {data:employment}=await supabase.from('employment_history').select('*,companies(id,name)').in('user_id',ids).eq('is_current',true);
  return profiles.map(p=>({...p,current:(employment||[]).find(e=>e.user_id===p.id)}));
}
async function jobCards(limit=6){
  const jobs=await query('jobs',{eq:{status:'approved'},order:{column:'created_at'},limit:500});
  return jobs.filter(job=>!isJobExpired(job)).slice(0,limit);
}

function isJobExpired(job){if(!job?.deadline)return false;const end=new Date(`${job.deadline}T23:59:59`);return Number.isFinite(end.getTime())&&Date.now()>end.getTime();}
function jobDeadlineText(job){if(!job?.deadline)return '—';return new Intl.DateTimeFormat(state.lang==='bn'?'bn-BD':'en-GB',{dateStyle:'medium'}).format(new Date(`${job.deadline}T00:00:00`));}
function updateLiveJobBadges(count){$$('[data-live-job-count]').forEach(badge=>{badge.textContent=String(count);badge.hidden=count<1;});}
async function refreshLiveJobBadge(){try{updateLiveJobBadges((await jobCards(500)).length);}catch(error){console.warn('Live job count unavailable:',error.message||error);}}

function renderCompanyCard(c){
  return `<article class="card"><div class="card-head"><div class="logo">${esc(initials(c.name))}</div><div><div>${statusBadge('approved')}</div><h3>${esc(c.name)}</h3><p>${esc(c.location||'Bangladesh')}</p></div></div><div class="score"><strong>${c.rating?c.rating.toFixed(1):'—'}</strong><span class="stars">★★★★★</span><small>(${c.reviewCount})</small></div><div class="mini-grid"><div><small>${esc(t('employeeCount'))}</small><b>${c.employeeCount}</b></div><div><small>${esc(t('teamLead'))}</small><b>${c.teamLead?c.teamLead.toFixed(1):'—'}</b></div><div><small>${esc(t('nightShift'))}</small><b>${c.night_shift?'Yes':'No'}</b></div></div><div class="card-foot"><span>${esc(c.worker_capacity_min||0)}–${esc(c.worker_capacity_max||0)} workers</span><a href="#company?id=${encodeURIComponent(c.id)}">${esc(t('view'))} →</a></div></article>`;
}
function renderProfessionalCard(p){
  const current=p.current,isAdminOwner=state.user?.id===p.id&&state.profile?.role==='admin';
  const displayProfile=isAdminOwner?{...p,...state.profile,role:'admin',status:'approved',current}:p;
  return `<article class="card${displayProfile.role==='admin'?' admin-profile-card':''}"><div class="card-head">${avatarMarkup(displayProfile,displayProfile.full_name)}<div><div>${adminBadge(displayProfile)} ${companyEmailBadge(displayProfile)}</div><h3>${esc(displayProfile.full_name||'Professional')}</h3><p>${esc(current?.designation||'—')}</p></div></div><div class="fact"><small>${esc(t('currentCompany'))}</small><b>${esc(current?.companies?.name||current?.company_name_snapshot||'—')}</b></div><div class="skill-cloud">${(displayProfile.skills||[]).slice(0,5).map(s=>`<span>${esc(s)}</span>`).join('')}</div><div class="card-foot"><span>${esc(current?.location||displayProfile.location||'Bangladesh')}</span><a href="#professional?id=${encodeURIComponent(displayProfile.id)}">${esc(t('view'))} →</a></div></article>`;
}
function renderJobCard(job){
  return `<article class="card job-card"><span class="badge approved">${esc(t('approved'))}</span><h3>${esc(job.designation)}</h3><p>${esc(job.company_name)}</p><div class="salary">${esc(job.salary)}</div><p>${esc(job.location)}</p><div class="job-deadline"><small>${esc(t('deadline'))}</small><strong>${esc(jobDeadlineText(job))}</strong></div><div class="card-foot"><span>${formatDate(job.created_at)}</span><button class="button ghost small" data-view-job="${esc(job.id)}">${esc(t('view'))}</button></div></article>`;
}

function ratingDashboardMarkup(company,position=1,total=1){
  const bn=state.lang==='bn',rating=number(company?.rating),lead=number(company?.teamLead);
  return `<div class="score-panel top-company-score"><strong>${rating?rating.toFixed(1):'—'}</strong><div><div class="stars">★★★★★</div><p>${esc(company?.name||t('noData'))}</p>${total>1?`<small>${bn?'যৌথভাবে শীর্ষ রেটিং':'Joint top rating'} · ${position}/${total}</small>`:''}</div></div><div class="score-list"><div class="score-item"><span>${bn?'সামগ্রিক রেটিং':'Overall rating'}</span><b>${rating?rating.toFixed(1):'—'}</b><i style="--value:${rating?Math.round(rating/5*100):0}%"></i></div><div class="score-item ${lead&&lead<3?'alert':''}"><span>${esc(t('teamLead'))}</span><b>${lead?lead.toFixed(1):'—'}</b><i style="--value:${lead?Math.round(lead/5*100):0}%"></i></div><div class="score-item"><span>${esc(t('reviews'))}</span><b>${company?.reviewCount||0}</b><i style="--value:${company?.reviewCount?Math.min(100,company.reviewCount*5):0}%"></i></div><div class="score-item"><span>${esc(t('employeeCount'))}</span><b>${company?.employeeCount||0}</b><i style="--value:${company?.employeeCount?Math.min(100,company.employeeCount*5):0}%"></i></div></div>`;
}
function activateTopCompanyRotation(companies){
  if(companies.length<2)return;
  let index=0;
  ratingRotationTimer=setInterval(()=>{
    if(state.route!=='home'){clearInterval(ratingRotationTimer);ratingRotationTimer=null;return;}
    const target=$('#ratingDashboardBody');if(!target)return;
    index=(index+1)%companies.length;target.innerHTML=ratingDashboardMarkup(companies[index],index+1,companies.length);
  },60000);
}
function homeGuidelineMarkup(company,professional){
  const bn=state.lang==='bn';
  const points=bn?
    [['কাজের দিকনির্দেশনা','ভালো টিম লিডার কাজ পরিষ্কারভাবে বুঝিয়ে দেন।'],['সমস্যার সমাধান','সহযোগিতামূলক নেতৃত্ব চাপ ও ভুল কমায়।'],['শেখা ও উন্নতি','নিয়মিত feedback দক্ষতা ও career growth বাড়ায়।'],['সুস্থ পরিবেশ','সম্মানজনক আচরণ কর্মপরিবেশ নিরাপদ রাখে।']]:
    [['Clear direction','A good team lead explains the work and priorities clearly.'],['Problem solving','Supportive leadership reduces pressure and preventable mistakes.'],['Learning and growth','Useful feedback improves skills and career growth.'],['Healthy workplace','Respectful behaviour creates a safer work environment.']];
  const categories=bn?
    [['বেতন ও সুবিধা','salaryBenefits'],['কাজের পরিবেশ','workEnvironment'],['ম্যানেজমেন্ট','managementRating'],['ক্যারিয়ার গ্রোথ','careerGrowth'],['টিম লিডার','teamLead'],['Work-life balance','workLife']]:
    [['Salary & benefits','salaryBenefits'],['Work environment','workEnvironment'],['Management','managementRating'],['Career growth','careerGrowth'],['Team lead','teamLead'],['Work-life balance','workLife']];
  const steps=bn?
    [['১','সাইনআপ ও ইমেইল যাচাই','সঠিক ব্যক্তিগত ও বর্তমান কোম্পানির তথ্য দিন।'],['২','প্রোফাইল সম্পূর্ণ করুন','ছবি, CV, skills ও চাকরির ইতিহাস যোগ করুন।'],['৩','কোম্পানি যাচাই করুন','রেটিং, সুবিধা ও anonymous review দেখে সিদ্ধান্ত নিন।'],['৪','অভিজ্ঞতা শেয়ার করুন','সত্য রিভিউ দিন; company email verified হলে job post করুন।']]:
    [['1','Sign up and verify email','Add accurate personal and current-company information.'],['2','Complete your profile','Add a photo, CV, skills and employment history.'],['3','Research companies','Compare ratings, benefits and anonymous reviews.'],['4','Share and contribute','Post truthful reviews; verified company-email users may post jobs.']];
  return `<section class="section home-guides"><div class="container"><div class="guide-panel"><div><span class="eyebrow">${bn?'কর্মক্ষেত্র বোঝার গাইড':'Workplace guide'}</span><h2>${bn?'টিম লিডার কেমন—কেন এটি গুরুত্বপূর্ণ?':'Why does team-lead quality matter?'}</h2><div class="guide-points">${points.map(([title,text],i)=>`<article><span>${i+1}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></article>`).join('')}</div></div><div class="leader-outcomes"><article class="outcome bad"><div class="outcome-icons"><b>▦</b><span>+</span><b>☹</b><span>=</span><strong>!</strong></div><h3>${bn?'দুর্বল নেতৃত্ব':'Poor leadership'}</h3><p>${bn?'চাপ, ভুল বোঝাবুঝি ও অসন্তুষ্টি বাড়ায়।':'Creates pressure, confusion and dissatisfaction.'}</p></article><article class="outcome good"><div class="outcome-icons"><b>▦</b><span>+</span><b>☺</b><span>=</span><strong>✓</strong></div><h3>${bn?'ভালো নেতৃত্ব':'Good leadership'}</h3><p>${bn?'সহযোগিতা, উন্নতি ও কাজের মান বাড়ায়।':'Improves support, growth and work quality.'}</p></article></div></div></div></section>
  <section class="section soft rating-explainer"><div class="container"><div class="section-heading"><span class="eyebrow">${bn?'স্বচ্ছ কোম্পানি রেটিং':'Transparent company ratings'}</span><h2>${bn?'এক নজরে গুরুত্বপূর্ণ কর্মপরিবেশ সূচক':'Important workplace indicators at a glance'}</h2><p>${bn?'অনুমোদিত কর্মীদের রিভিউ থেকে প্রতিটি ক্যাটাগরির গড় রেটিং তৈরি হয়।':'Category averages are calculated from approved employee reviews.'}</p></div><div class="rating-category-grid">${categories.map(([label,key],index)=>{const value=number(company?.[key]);return `<article class="rating-category ${key==='teamLead'&&value&&value<3?'low':''}"><span>${['▣','♟','♜','↗','♟','⚖'][index]}</span><h3>${esc(label)}</h3><strong>${value?value.toFixed(1):'—'}</strong><small>/ 5</small></article>`;}).join('')}</div><div class="safe-review-panel"><div><span class="safe-icon">✓</span><div><h3>${bn?'নিরাপদ ও দায়িত্বশীল রিভিউ':'Safe and responsible reviews'}</h3><p>${bn?'রিভিউ anonymous রাখা যায়, প্রকাশের আগে moderation হয় এবং ব্যক্তিগত তথ্য দেখানো হয় না।':'Reviews may stay anonymous, are moderated before publication, and do not expose private information.'}</p></div></div><ul><li>${bn?'শুধু নিজের অভিজ্ঞতা লিখুন':'Use first-hand experience only'}</li><li>${bn?'ব্যক্তিগত তথ্য প্রকাশ করবেন না':'Do not expose personal information'}</li><li>${bn?'সম্মানজনক ও প্রমাণভিত্তিক ভাষা ব্যবহার করুন':'Use respectful, evidence-based language'}</li></ul><a class="button ghost small" href="#review-guidelines">${bn?'সম্পূর্ণ গাইডলাইন':'Full guidelines'}</a></div></div></section>
  <section class="section usage-section"><div class="container"><div class="section-heading"><span class="eyebrow">${bn?'ব্যবহার পদ্ধতি':'How to use PrepressHub'}</span><h2>${bn?'চারটি সহজ ধাপে শুরু করুন':'Get started in four simple steps'}</h2></div><div class="usage-grid">${steps.map(([number,title,text])=>`<article><span>${esc(number)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div><div class="profile-cta"><div><span class="eyebrow" style="color:#dffcff">${bn?'প্রফেশনাল নেটওয়ার্ক':'Professional network'}</span><h2>${bn?'আপনার প্রোফাইল তৈরি করুন':'Build your professional profile'}</h2><p>${bn?'দক্ষতা ও অভিজ্ঞতা তুলে ধরুন, কোম্পানি সম্পর্কে জানুন এবং verified company email দিয়ে চাকরি পোস্ট করুন।':'Showcase your skills and experience, research companies, and post jobs with a verified company email.'}</p><div class="hero-actions"><button class="button primary" data-auth="signup">${esc(t('createProfile'))}</button><a class="button ghost" href="#professionals">${esc(t('professionals'))}</a></div></div><div class="profile-preview"><div class="avatar round">${esc(initials(professional?.full_name||'PrepressHub User'))}</div><div><span class="badge verified">✓ ${bn?'ভেরিফায়েড প্রোফাইল':'Verified profile'}</span><h3>${esc(professional?.full_name||(bn?'আপনার নাম':'Your name'))}</h3><p>${esc(professional?.current?.designation||(bn?'আপনার পদবি':'Your designation'))}</p><div class="skill-cloud"><span>CV</span><span>Skills</span><span>Experience</span></div></div></div></div></div></section>`;
}

async function renderHome(){
  const [stats,allCompanies,professionals,jobs,ads]=await Promise.all([homeStats(),companyCards(200),professionalCards(3),jobCards(3),query('advertisements',{eq:{status:'approved',placement:'homepage'},order:{column:'created_at'},limit:3})]);
  const rankedCompanies=[...allCompanies].filter(company=>company.reviewCount>0&&company.rating>0).sort((a,b)=>b.rating-a.rating||b.reviewCount-a.reviewCount||b.employeeCount-a.employeeCount);
  const featuredCompanies=[...(rankedCompanies.length?rankedCompanies:allCompanies)].slice(0,3);
  const topCompany=rankedCompanies[0]||featuredCompanies[0]||null;
  const topCompanies=topCompany?rankedCompanies.filter(company=>Math.abs(company.rating-topCompany.rating)<0.001):[];
  app.innerHTML=`
  <section class="hero"><div class="container hero-grid"><div><span class="eyebrow">${esc(t('heroEyebrow'))}</span><h1>${t('heroTitle')}</h1><p>${esc(t('heroText'))}</p><div class="hero-actions"><a class="button primary" href="#companies">${esc(t('browseCompanies'))}</a><button class="button ghost" data-auth="signup">${esc(t('createProfile'))}</button></div><form class="hero-search" id="globalSearch"><input name="q" placeholder="${esc(t('searchPlaceholder'))}"><button class="button dark" type="submit">${esc(t('search'))}</button></form><div class="trust-row"><span>✓ ${state.lang==='bn'?'তাৎক্ষণিক ইউজার অ্যাক্সেস':'Instant user access'}</span><span>✓ ${state.lang==='bn'?'নিরাপদ CV স্টোরেজ':'Private CV storage'}</span><span>✓ ${state.lang==='bn'?'মডারেটেড রিভিউ':'Moderated reviews'}</span><span>✓ ${state.lang==='bn'?'কোম্পানি যাচাই':'Company verification'}</span></div></div><div class="dashboard-card"><div class="dashboard-head"><div><span class="eyebrow" style="color:#dffcff">${state.lang==='bn'?'কোম্পানি ইনটেলিজেন্স':'Company intelligence'}</span><h3>${state.lang==='bn'?'শীর্ষ কর্মপরিবেশ রেটিং':'Top workplace rating'}</h3></div><span class="status-pill">${state.lang==='bn'?'লাইভ ডেটা':'Live data'}</span></div><div id="ratingDashboardBody">${ratingDashboardMarkup(topCompany,1,topCompanies.length||1)}</div></div></div></section>
  <section class="stats"><div class="container stats-grid"><div><strong>${stats.profiles}</strong><span>${esc(t('approvedProfiles'))}</span></div><div><strong>${stats.companies}</strong><span>${esc(t('approvedCompanies'))}</span></div><div><strong>${stats.jobs}</strong><span>${esc(t('openJobs'))}</span></div><div><strong>${stats.reviews}</strong><span>${esc(t('approvedReviews'))}</span></div></div></section>
  ${homeGuidelineMarkup(topCompany,professionals[0])}
  ${ads.length?`<section class="section soft"><div class="container"><div class="section-heading"><span class="eyebrow">Sponsored</span><h2>${esc(t('advertise'))}</h2></div><div class="grid-3">${ads.map(renderAdCard).join('')}</div></div></section>`:''}
  <section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Company intelligence</span><h2>${esc(t('featuredCompanies'))}</h2></div><div class="grid-3">${featuredCompanies.length?featuredCompanies.map(renderCompanyCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>
  <section class="section soft"><div class="container"><div class="section-heading"><span class="eyebrow">Professional network</span><h2>${esc(t('latestProfessionals'))}</h2></div><div class="grid-3">${professionals.length?professionals.map(renderProfessionalCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>
  <section class="section"><div class="container"><div class="section-heading"><span class="eyebrow">Career opportunities</span><h2>${esc(t('latestJobs'))}</h2></div><div class="grid-3">${jobs.length?jobs.map(renderJobCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>`;
  activateTopCompanyRotation(topCompanies);
}

async function renderCompanies(){
  const companies=await companyCards(200);
  app.innerHTML=`<section class="page-hero"><div class="container page-hero-grid"><div><span class="eyebrow">Company intelligence</span><h1>${esc(t('companyDirectory'))}</h1><p>${esc(t('publicNotice'))}</p></div></div></section><section class="section soft"><div class="container"><div class="toolbar"><input id="companySearch" placeholder="${esc(t('searchPlaceholder'))}"></div><div class="grid-3" id="companyGrid">${companies.length?companies.map(renderCompanyCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>`;
  $('#companySearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();$('#companyGrid').innerHTML=companies.filter(c=>`${c.name} ${c.location}`.toLowerCase().includes(q)).map(renderCompanyCard).join('')||`<div class="empty">${esc(t('noData'))}</div>`;});
}

async function renderCompany(id){
  if(!id){location.hash='#companies';return;}
  const {data:company,error}=await supabase.from('companies').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!company){app.innerHTML=`<section class="page-hero"><div class="container"><div class="empty">${esc(t('noData'))}</div></div></section>`;return;}
  const [{data:employment},{data:reviews}]=await Promise.all([
    supabase.from('employment_history').select('*,profiles(id,full_name,location,avatar_path,role,company_email_verified,status)').eq('company_id',id).eq('is_current',true),
    supabase.from('review_feed').select('*').eq('company_id',id).order('created_at',{ascending:false})
  ]);
  const employees=(employment||[]).filter(e=>e.profiles?.status==='approved');
  const rs=reviews||[];const rating=rs.length?rs.reduce((a,r)=>a+number(r.overall_rating),0)/rs.length:0;
  app.innerHTML=`<section class="page-hero"><div class="container"><div class="company-header"><div class="logo">${esc(initials(company.name))}</div><div>${statusBadge(company.status)}<h1>${esc(company.name)}</h1><p>${esc(company.location||'Bangladesh')}</p></div><div><strong style="font-size:42px">${rating?rating.toFixed(1):'—'}</strong><div class="stars">★★★★★</div></div></div></div></section><section class="section soft"><div class="container company-layout"><aside class="side-card"><h3>Company facts</h3><div class="fact-list"><div class="fact"><small>${esc(t('employeeCount'))}</small><b>${employees.length}</b></div><div class="fact"><small>Capacity</small><b>${company.worker_capacity_min||0}–${company.worker_capacity_max||0}</b></div><div class="fact"><small>${esc(t('compliance'))}</small><b>${yesNo(company.compliance)}</b></div><div class="fact"><small>${esc(t('providentFund'))}</small><b>${yesNo(company.provident_fund)}</b></div><div class="fact"><small>${esc(t('salary'))}</small><b>${company.salary_day_from||'—'}–${company.salary_day_to||'—'}</b></div><div class="fact"><small>${esc(t('nightShift'))}</small><b>${yesNo(company.night_shift)}</b></div></div><div class="row-actions">${state.profile?.status==='approved'?`<button class="button primary full" data-review-company="${esc(id)}">${esc(t('writeReview'))}</button>`:''}</div></aside><div><section class="detail-card"><div class="section-heading"><span class="eyebrow">People</span><h2>${esc(t('employeeCount'))}: ${employees.length}</h2></div><div class="employee-list">${employees.length?employees.map(e=>`<a class="employee${e.profiles?.role==='admin'?' admin-employee':''}" href="#professional?id=${encodeURIComponent(e.user_id)}">${avatarMarkup(e.profiles,e.profiles?.full_name)}<div>${adminBadge(e.profiles)} ${companyEmailBadge(e.profiles)}<strong>${esc(e.profiles?.full_name||'Professional')}</strong><p>${esc(e.designation)}</p></div></a>`).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></section><section class="detail-card" style="margin-top:20px"><div class="section-heading"><span class="eyebrow">Reviews</span><h2>${esc(t('reviews'))} (${rs.length})</h2></div>${rs.length?rs.map(renderReview).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</section></div></div></section>`;
  const reviewActions=$('.side-card .row-actions');
  if(reviewActions&&!reviewActions.querySelector('[data-review-company]'))reviewActions.innerHTML=`<button class="button primary full" data-review-company="${esc(id)}">${esc(t('writeReview'))}</button>`;
}
function renderReview(r){
  const reviewer=r.is_anonymous?t('anonymous'):(r.reviewer_name||'Professional');
  return `<article class="review"><div class="review-head"><div><strong>${esc(reviewer)}</strong><p>${esc(r.employment_status==='current'?t('currentEmployee'):t('formerEmployee'))}</p></div><div><strong>${number(r.overall_rating).toFixed(1)}</strong><div class="stars">★★★★★</div></div></div><p><b>${esc(t('teamLead'))}:</b> ${esc(r.team_leader_name||'—')} (${number(r.team_lead_rating).toFixed(1)})</p><p><b>${esc(t('nightShift'))}:</b> ${r.night_shift?'Yes':'No'}</p><p><b>${esc(t('pros'))}:</b> ${nl2br(r.pros||'—')}</p><p><b>${esc(t('cons'))}:</b> ${nl2br(r.cons||'—')}</p></article>`;
}

async function renderProfessionals(){
  const professionals=await professionalCards(300);
  app.innerHTML=`<section class="page-hero"><div class="container"><span class="eyebrow">Professional network</span><h1>${esc(t('professionalDirectory'))}</h1><p>${esc(t('publicNotice'))}</p></div></section><section class="section soft"><div class="container"><div class="toolbar"><input id="professionalSearch" placeholder="${esc(t('searchPlaceholder'))}"></div><div class="grid-3" id="professionalGrid">${professionals.length?professionals.map(renderProfessionalCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>`;
  $('#professionalSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();$('#professionalGrid').innerHTML=professionals.filter(p=>`${p.full_name} ${p.current?.designation||''} ${p.current?.companies?.name||''}`.toLowerCase().includes(q)).map(renderProfessionalCard).join('')||`<div class="empty">${esc(t('noData'))}</div>`;});
}

async function renderProfessional(id){
  if(!id){location.hash='#professionals';return;}
  const {data:p,error}=await supabase.from('profiles').select('*').eq('id',id).maybeSingle();if(error)throw error;if(!p){app.innerHTML=`<section class="page-hero"><div class="container"><div class="empty">${esc(t('noData'))}</div></div></section>`;return;}
  const {data:employment}=await supabase.from('employment_history').select('*,companies(id,name)').eq('user_id',id).order('is_current',{ascending:false}).order('start_date',{ascending:false});
  const current=(employment||[]).find(e=>e.is_current), previous=(employment||[]).filter(e=>!e.is_current);
  const isOwner=state.user?.id===p.id,isAdminOwner=isOwner&&state.profile?.role==='admin';
  const displayProfile=isAdminOwner?{...p,...state.profile,role:'admin',status:'approved'}:p;
  const ownerActions=isOwner?`<div class="profile-owner-actions"><a class="button admin-edit-button" href="#account">${esc(isAdminOwner?t('editAdminProfile'):t('editProfile'))}</a>${isAdminOwner?`<a class="button ghost" href="#admin">${esc(t('adminDashboard'))}</a>`:''}</div>`:'';
  app.innerHTML=`<section class="page-hero"><div class="container"><div class="profile-header${displayProfile.role==='admin'?' admin-profile-header':''}">${avatarMarkup(displayProfile,displayProfile.full_name)}<div>${adminBadge(displayProfile)} ${statusBadge(displayProfile.status)} ${companyEmailBadge(displayProfile)}<h1>${esc(displayProfile.full_name||'Professional')}</h1><p>${esc(current?.designation||'—')} · ${esc(current?.companies?.name||current?.company_name_snapshot||'—')}</p>${ownerActions}</div><div class="completion" style="--value:${Math.max(0,Math.min(100,displayProfile.profile_completion||0))}%"><span>${displayProfile.profile_completion||0}%</span></div></div></div></section><section class="section soft"><div class="container profile-layout"><aside class="side-card"><h3>${esc(t('presentRole'))}</h3><div class="fact-list"><div class="fact"><small>${esc(t('currentCompany'))}</small><b>${esc(current?.companies?.name||current?.company_name_snapshot||'—')}</b></div><div class="fact"><small>${esc(t('currentDesignation'))}</small><b>${esc(current?.designation||'—')}</b></div><div class="fact"><small>${esc(t('companyLocation'))}</small><b>${esc(current?.location||displayProfile.location||'—')}</b></div></div>${displayProfile.has_cv?`<div class="row-actions"><button class="button primary full" data-preview-cv="${esc(displayProfile.id)}">${esc(t('previewCv'))}</button></div><p style="font-size:12px;color:var(--muted)">${esc(t('noDownload'))}</p>`:''}</aside><div><section class="detail-card"><h2>${esc(t('bio'))}</h2><p>${nl2br(displayProfile.bio||'—')}</p><div class="skill-cloud">${(displayProfile.skills||[]).map(s=>`<span>${esc(s)}</span>`).join('')}</div></section><section class="detail-card" style="margin-top:20px"><h2>${esc(t('careerHistory'))}</h2>${previous.length?previous.map(e=>`<div class="employee"><div class="logo">${esc(initials(e.companies?.name||e.company_name_snapshot))}</div><div><strong>${esc(e.companies?.name||e.company_name_snapshot||'—')}</strong><p>${esc(e.designation)} · ${esc(e.location||'—')} · ${esc(e.start_date||'—')}–${esc(e.end_date||'Present')}</p></div></div>`).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</section></div></div></section>`;
}

async function renderJobs(){
  const jobs=await jobCards(200);
  const canPost=canPostVerifiedJob();
  app.innerHTML=`<section class="page-hero"><div class="container page-hero-grid"><div><span class="eyebrow">Career opportunities</span><h1>${esc(t('jobPortal'))}</h1><p>${esc(t('realJobWarning'))}</p>${state.user&&!canPost?`<div class="notice warning">${state.lang==='bn'?'Admin অথবা verified company email-সহ registered user চাকরি পোস্ট করতে পারবেন।':'Administrators and registered users with a verified company email can post jobs.'}</div>`:''}</div>${canPost?`<button class="button primary" data-open-job>${esc(t('postJob'))}</button>`:''}</div></section><section class="section soft"><div class="container"><div class="grid-3">${jobs.length?jobs.map(renderJobCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>`;
}
async function viewJob(id){
  const {data:job,error}=await supabase.from('jobs').select('*').eq('id',id).maybeSingle();if(error||!job)return showToast(t('error'),'error');
  const expired=isJobExpired(job)||job.application_closed,whatsapp=String(job.whatsapp_number||'').replace(/\D/g,'');
  const applyMethods=expired?`<div class="notice danger"><strong>${esc(t('applicationsClosed'))}</strong><p>${state.lang==='bn'?'Deadline শেষ হওয়ায় Email ও WhatsApp application বন্ধ আছে।':'Email and WhatsApp applications are locked because the deadline has passed.'}</p></div>`:(job.apply_email||whatsapp?`<div class="job-apply-methods">${job.apply_email?`<a class="button primary" href="mailto:${encodeURIComponent(job.apply_email)}?subject=${encodeURIComponent(`Application for ${job.designation} — ${job.company_name}`)}">✉ ${esc(t('applyEmail'))}</a>`:''}${whatsapp?`<a class="button whatsapp-button" href="https://wa.me/${esc(whatsapp)}?text=${encodeURIComponent(`I would like to apply for ${job.designation} at ${job.company_name}.`)}" target="_blank" rel="noopener">◉ ${esc(t('whatsapp'))}</a>`:''}</div>`:`<div class="notice warning">${state.lang==='bn'?'এই পুরোনো job post-এ application contact দেওয়া নেই।':'This older job post has no application contact.'}</div>`);
  openModal(genericModal,`<div class="modal-body"><span class="eyebrow">Job circular</span><h2>${esc(job.designation)}</h2><p><b>${esc(job.company_name)}</b> · ${esc(job.location)}</p><div class="job-summary-grid"><div class="notice">${esc(t('salary'))}: <b>${esc(job.salary)}</b></div><div class="notice ${expired?'danger':''}">${esc(t('deadline'))}: <b>${esc(jobDeadlineText(job))}</b></div></div><p>${nl2br(job.description)}</p>${applyMethods}<p><small>${esc(t('realJobWarning'))}</small></p></div>`);
}

function renderAdCard(ad){
  const image=ad.banner_path?publicFileUrl(ad.banner_path):'';
  return `<article class="card ad-card"><div class="ad-media">${image?`<img src="${esc(image)}" alt="${esc(ad.title)}">`:'ADVERTISEMENT'}</div><span class="sponsored">SPONSORED</span><h3>${esc(ad.title)}</h3><p>${esc(ad.description)}</p><div class="card-foot"><span>${esc(ad.advertiser_name)}</span>${ad.target_url?`<a href="${esc(ad.target_url)}" target="_blank" rel="noopener">${esc(t('view'))} →</a>`:''}</div></article>`;
}
async function renderAdvertisements(){
  const ads=await query('advertisements',{eq:{status:'approved'},order:{column:'created_at'},limit:200});
  app.innerHTML=`<section class="page-hero"><div class="container page-hero-grid"><div><span class="eyebrow">Industry advertising</span><h1>${esc(t('adDirectory'))}</h1><p>Company, software, training, recruitment and industry services.</p></div>${state.profile?.status==='approved'?`<button class="button primary" data-open-ad>${esc(t('submitAd'))}</button>`:''}</div></section><section class="section soft"><div class="container"><div class="grid-3">${ads.length?ads.map(renderAdCard).join(''):`<div class="empty">${esc(t('noData'))}</div>`}</div></div></section>`;
}

async function renderAccount(){
  if(!state.user){openAuth('login');location.hash='#home';return;}
  await refreshAuth();
  if(state.profile?.account_type==='company') await renderCompanyAccount(); else await renderProfessionalAccount();
}
async function renderProfessionalAccount(){
  const {data:employment}=await supabase.from('employment_history').select('*,companies(id,name)').eq('user_id',state.user.id).order('is_current',{ascending:false}).order('start_date',{ascending:false});
  const current=(employment||[]).find(e=>e.is_current),previous=(employment||[]).filter(e=>!e.is_current);
  const isAdmin=state.profile?.role==='admin',showEmployment=!isAdmin||Boolean(current)||previous.length>0;
  const photoControls=`<label class="field"><span>${esc(t('uploadPhoto'))}</span><input name="avatar" type="file" accept="image/png,image/jpeg,image/webp"><small>${esc(t('photoHelp'))}</small></label>${state.profile?.avatar_path?`<label class="check photo-remove"><input type="checkbox" name="removeAvatar"><span>${esc(t('removePhoto'))}</span></label>`:''}`;
  const employmentControls=showEmployment?`<label class="field"><span>${esc(t('currentCompany'))}</span><input name="currentCompany" id="currentCompanyInput" ${isAdmin?'':'required'} value="${esc(current?.companies?.name||current?.company_name_snapshot||'')}"><div class="suggestions" id="companySuggestions"></div></label><label class="field"><span>${esc(t('currentCompanyLocation'))}</span><input name="currentCompanyLocation" ${isAdmin?'':'required'} value="${esc(current?.location||'')}"></label><label class="field"><span>${esc(t('currentDesignation'))}</span><input name="currentDesignation" ${isAdmin?'':'required'} value="${esc(current?.designation||'')}"></label>`:'';
  app.innerHTML=`<section class="page-hero"><div class="container"><div class="profile-header${isAdmin?' admin-profile-header':''}">${avatarMarkup(state.profile,state.profile?.full_name||state.user.email)}<div>${adminBadge(state.profile)} ${statusBadge(state.profile?.status)} ${companyEmailBadge(state.profile)}<h1>${esc(state.profile?.full_name||state.user.email)}</h1><p>${esc(state.user.email)}</p></div><div class="completion" style="--value:${state.profile?.profile_completion||0}%"><span>${state.profile?.profile_completion||0}%</span></div></div></div></section><section class="section soft"><div class="container"><div class="notice ${state.profile?.status==='approved'?'success':'warning'}">${state.profile?.status==='approved'?esc(t('approved')):esc(t('notApproved'))}</div><form class="form-card" id="profileForm" data-manage-employment="${showEmployment}" style="margin-top:20px"><div class="profile-photo-editor">${avatarMarkup(state.profile,state.profile?.full_name||state.user.email,'avatar round profile-photo-preview')}<div><span class="eyebrow">${esc(t('profilePhoto'))}</span><h2>${esc(t('uploadPhoto'))}</h2><p>${esc(t('photoHelp'))}</p></div></div><div class="form-grid"><label class="field"><span>${esc(t('fullName'))}</span><input name="fullName" required value="${esc(state.profile?.full_name||'')}"></label><label class="field"><span>${esc(t('phone'))}</span><input name="phone" required value="${esc(state.profile?.phone||'')}"></label><label class="field"><span>${esc(t('location'))}</span><input name="location" required value="${esc(state.profile?.location||'')}"></label><label class="field"><span>${esc(t('skills'))}</span><input name="skills" required value="${esc((state.profile?.skills||[]).join(', '))}"></label><label class="field full"><span>${esc(t('bio'))}</span><textarea name="bio">${esc(state.profile?.bio||'')}</textarea></label><label class="field"><span>${esc(t('portfolio'))}</span><input name="portfolio" value="${esc(state.profile?.portfolio_url||'')}"></label>${photoControls}<label class="field"><span>${esc(t('uploadCv'))}</span><input name="cv" type="file" accept="application/pdf,.pdf"></label>${employmentControls}</div>${showEmployment?`<h3>${esc(t('previousExperience'))}</h3><div id="experienceRows">${previous.map(renderExperienceRow).join('')}</div><button class="button ghost small" type="button" data-add-experience>${esc(t('addExperience'))}</button>`:''}<div class="form-actions"><button class="button primary" type="submit">${esc(t('save'))}</button></div></form></div></section>`;
  if($('#currentCompanyInput'))bindCompanySuggestions($('#currentCompanyInput'),$('#companySuggestions'));
}
function renderExperienceRow(e={}){
  return `<div class="form-grid experience-row"><label class="field"><span>${esc(t('companyName'))}</span><input data-exp="company" value="${esc(e.companies?.name||e.company_name_snapshot||'')}"></label><label class="field"><span>${esc(t('companyLocation'))}</span><input data-exp="location" value="${esc(e.location||'')}"></label><label class="field"><span>${esc(t('designation'))}</span><input data-exp="designation" value="${esc(e.designation||'')}"></label><label class="field"><span>${esc(t('from'))}</span><input type="date" data-exp="from" value="${esc(e.start_date||'')}"></label><label class="field"><span>${esc(t('to'))}</span><input type="date" data-exp="to" value="${esc(e.end_date||'')}"></label><button class="button danger small" type="button" data-remove-experience>${esc(t('delete'))}</button></div>`;
}
async function renderCompanyAccount(){
  const company=state.company;
  if(!company){app.innerHTML=`<section class="page-hero"><div class="container"><div class="notice warning">Company record is not ready.</div></div></section>`;return;}
  const canEdit=company.claimed_by===state.user.id;
  app.innerHTML=`<section class="page-hero"><div class="container"><div class="company-header"><div class="logo">${esc(initials(company.name))}</div><div>${statusBadge(company.status)} ${companyEmailBadge(state.profile)}<h1>${esc(company.name)}</h1><p>${esc(state.user.email)}</p></div></div></div></section><section class="section soft"><div class="container"><div class="notice ${canEdit?(company.status==='approved'?'success':'warning'):'warning'}">${canEdit?(company.status==='approved'?esc(t('approved')):esc(t('notApproved'))):'Existing company claim is waiting for administrator approval. Company information is read-only until the claim is approved.'}</div>${canEdit?`<form class="form-card" id="companyProfileForm" style="margin-top:20px"><div class="form-grid"><label class="field"><span>${esc(t('companyName'))}</span><input value="${esc(company.name)}" disabled></label><label class="field"><span>${esc(t('location'))}</span><input name="location" required value="${esc(company.location||'')}"></label><label class="field"><span>${esc(t('capacityMin'))}</span><input type="number" min="0" name="capacityMin" value="${company.worker_capacity_min||0}"></label><label class="field"><span>${esc(t('capacityMax'))}</span><input type="number" min="0" name="capacityMax" value="${company.worker_capacity_max||0}"></label><label class="field"><span>${esc(t('salaryFrom'))}</span><input type="number" min="1" max="31" name="salaryFrom" value="${company.salary_day_from||''}"></label><label class="field"><span>${esc(t('salaryTo'))}</span><input type="number" min="1" max="31" name="salaryTo" value="${company.salary_day_to||''}"></label><label class="field"><span>${esc(t('website'))}</span><input type="url" name="website" value="${esc(company.website||'')}"></label><label class="field"><span>${esc(t('officialDomain'))}</span><input value="${esc(company.email_domain||'Administrator verification pending')}" disabled><small>${state.lang==='bn'?'প্রমাণপত্র যাচাই করে administrator এই domain নির্ধারণ করবেন।':'The administrator sets this domain after reviewing your proof.'}</small></label>${['compliance','provident_fund','overtime_paid','weekly_holiday','festival_bonus','night_shift','transport','canteen'].map(key=>`<label class="check"><input type="checkbox" name="${key}" ${company[key]?'checked':''}><span>${esc(t(key==='provident_fund'?'providentFund':key==='overtime_paid'?'overtimePaid':key==='weekly_holiday'?'weeklyHoliday':key==='festival_bonus'?'festivalBonus':key==='night_shift'?'nightShift':key))}</span></label>`).join('')}</div><div class="form-actions"><button class="button primary" type="submit">${esc(t('save'))}</button></div></form>`:`<div class="detail-card" style="margin-top:20px"><div class="fact-list"><div class="fact"><small>${esc(t('location'))}</small><b>${esc(company.location||'—')}</b></div><div class="fact"><small>Capacity</small><b>${company.worker_capacity_min||0}–${company.worker_capacity_max||0}</b></div><div class="fact"><small>${esc(t('compliance'))}</small><b>${company.compliance?'Yes':'No'}</b></div></div></div>`}</div></section>`;
}

async function renderAdmin(){
  if(state.profile?.role!=='admin'){app.innerHTML=`<section class="page-hero"><div class="container"><div class="notice danger">${esc(t('adminOnly'))}</div></div></section>`;return;}
  const [{data:profiles},{data:companies},{data:reviews},{data:jobs},{data:ads},{data:claims}]=await Promise.all([
    supabase.from('profiles').select('*,profile_private(phone,cv_path)').order('created_at',{ascending:false}),supabase.from('companies').select('*,company_private(proof_path)').order('created_at',{ascending:false}),supabase.from('reviews').select('*,profiles(full_name),companies(name)').order('created_at',{ascending:false}),supabase.from('jobs').select('*').order('created_at',{ascending:false}),supabase.from('advertisements').select('*').order('created_at',{ascending:false}),supabase.from('company_claims').select('*,profiles(full_name),companies(name)').order('created_at',{ascending:false})
  ]);
  const pendingCount=[profiles,companies,reviews,jobs,ads,claims].flat().filter(x=>x?.status==='pending').length;
  app.innerHTML=`<section class="page-hero admin-dashboard-hero"><div class="container"><div class="admin-identity">${avatarMarkup(state.profile,state.profile?.full_name||state.user.email,'avatar round admin-avatar')}<div>${adminBadge(state.profile)}<span class="eyebrow">Control centre</span><h1>${esc(t('adminDashboard'))}</h1><p>${esc(state.profile?.full_name||state.user.email)} · ${esc(state.user.email)}</p></div><a class="button admin-edit-button" href="#account">${esc(t('editAdminProfile'))}</a></div></div></section><section class="section soft"><div class="container"><div class="admin-metrics"><div class="metric"><strong>${profiles?.length||0}</strong><span>${esc(t('users'))}</span></div><div class="metric"><strong>${companies?.length||0}</strong><span>${esc(t('companies'))}</span></div><div class="metric"><strong>${reviews?.length||0}</strong><span>${esc(t('reviews'))}</span></div><div class="metric"><strong>${jobs?.length||0}</strong><span>${esc(t('jobs'))}</span></div><div class="metric"><strong>${pendingCount}</strong><span>${esc(t('pending'))}</span></div></div>${adminCreateCompanyPanel()}${adminMergePanel(companies||[])}${adminTableProfiles(profiles||[])}${adminTableCompanies(companies||[])}${adminTableClaims(claims||[])}${adminTableContent('reviews',reviews||[])}${adminTableContent('jobs',jobs||[])}${adminTableContent('advertisements',ads||[])}</div></section>`;
}
function adminCreateCompanyPanel(){
  return `<section class="admin-section"><h2>${esc(t('addCompany'))}</h2><p class="muted">${state.lang==='bn'?'Admin এখানে নতুন কোম্পানি তৈরি করলে সেটি সাথে সাথে approved company হিসেবে Job form-এ পাওয়া যাবে।':'Companies created here become approved immediately and appear in the job form.'}</p><form id="adminCreateCompanyForm" class="form-grid"><label class="field"><span>${esc(t('companyName'))}</span><input name="name" required></label><label class="field"><span>${esc(t('companyLocation'))}</span><input name="location" required></label><label class="field"><span>${esc(t('officialDomain'))}</span><input name="domain" placeholder="example.com"></label><label class="field"><span>${esc(t('website'))}</span><input type="url" name="website"></label><div class="form-actions field full"><button class="button primary" type="submit">${esc(t('addCompany'))}</button></div></form></section>`;
}
async function createAdminCompany(form){
  const fd=new FormData(form);await rpc('admin_create_company',{p_company:{name:fd.get('name').trim(),location:fd.get('location').trim(),email_domain:fd.get('domain').trim().toLowerCase()||null,website:fd.get('website').trim()||null}});showToast(t('success'));await renderAdmin();
}
function adminMergePanel(companies){
  const options=companies.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.location||'')}</option>`).join('');
  return `<section class="admin-section"><h2>${esc(t('mergeCompanies'))}</h2><form id="mergeForm" class="form-grid"><label class="field"><span>${esc(t('sourceCompany'))}</span><select name="source" required><option value=""></option>${options}</select></label><label class="field"><span>${esc(t('targetCompany'))}</span><select name="target" required><option value=""></option>${options}</select></label><div class="form-actions field full"><button class="button danger" type="submit">${esc(t('merge'))}</button></div></form></section>`;
}
function adminTableProfiles(rows){
  return `<section class="admin-section"><h2>${esc(t('users'))}</h2><table class="data-table"><thead><tr><th>User</th><th>Type</th><th>${esc(t('status'))}</th><th>CV</th><th>${esc(t('actions'))}</th></tr></thead><tbody>${rows.map(p=>`<tr class="${p.role==='admin'?'admin-table-row':''}"><td><strong>${adminBadge(p)} ${esc(p.full_name||'—')}</strong><small>${esc(p.id)}</small></td><td>${esc(p.account_type)}${p.role==='admin'?` / ${esc(t('admin'))}`:''}</td><td>${statusBadge(p.status)}</td><td>${((Array.isArray(p.profile_private)?p.profile_private[0]:p.profile_private)?.cv_path||p.has_cv)?`<button class="neutral" data-admin-preview-cv="${esc(p.id)}">${esc(t('previewCv'))}</button>`:'—'}</td><td><div class="table-actions">${p.role==='admin'?`<a class="neutral admin-table-edit" href="#account">${esc(t('editAdminProfile'))}</a>`:`${p.status!=='approved'?`<button class="approve" data-admin-profile-status="approved" data-id="${esc(p.id)}">${esc(t('approve'))}</button>`:''}${p.status!=='rejected'?`<button class="reject" data-admin-profile-status="rejected" data-id="${esc(p.id)}">${esc(t('reject'))}</button>`:''}<button class="reject" data-admin-profile-status="${p.status==='banned'?'approved':'banned'}" data-id="${esc(p.id)}">${esc(t(p.status==='banned'?'unban':'ban'))}</button><button class="delete" data-admin-delete-profile="${esc(p.id)}">${esc(t('delete'))}</button>`}</div></td></tr>`).join('')}</tbody></table></section>`;
}
function adminTableCompanies(rows){
  return `<section class="admin-section"><h2>${esc(t('companies'))}</h2><table class="data-table"><thead><tr><th>Company</th><th>${esc(t('status'))}</th><th>Verified domain</th><th>Proof</th><th>${esc(t('possibleDuplicate'))}</th><th>${esc(t('actions'))}</th></tr></thead><tbody>${rows.map(c=>{const privateRow=Array.isArray(c.company_private)?c.company_private[0]:c.company_private;return `<tr><td><strong>${esc(c.name)}</strong><small>${esc(c.location||'')}</small></td><td>${statusBadge(c.status)}</td><td><strong>${esc(c.email_domain||'Not set')}</strong><div class="table-actions"><button class="neutral" data-admin-company-domain="${esc(c.id)}" data-current-domain="${esc(c.email_domain||'')}">Set domain</button></div></td><td>${privateRow?.proof_path?`<button class="neutral" data-admin-preview-proof="${esc(privateRow.proof_path)}" data-proof-title="${esc(c.name)}">View proof</button>`:'—'}</td><td>${c.duplicate_candidate_id?esc(c.duplicate_candidate_id):'—'}</td><td><div class="table-actions"><button class="neutral" data-admin-edit-company="${esc(c.id)}">${esc(t('editCompanyInfo'))}</button>${c.status!=='approved'?`<button class="approve" data-admin-company-status="approved" data-id="${esc(c.id)}">${esc(t('approve'))}</button>`:''}${c.status!=='rejected'?`<button class="reject" data-admin-company-status="rejected" data-id="${esc(c.id)}">${esc(t('reject'))}</button>`:''}<button class="delete" data-admin-delete-company="${esc(c.id)}">${esc(t('delete'))}</button></div></td></tr>`}).join('')}</tbody></table></section>`;
}

async function openAdminCompanyEditor(id){
  const {data:company,error}=await supabase.from('companies').select('*').eq('id',id).single();
  if(error)throw error;
  if(!company)throw new Error('Company not found.');
  const flag=(name,key)=>`<label class="check"><input type="checkbox" name="${name}" ${company[name]?'checked':''}><span>${esc(t(key||name))}</span></label>`;
  openModal(genericModal,`<div class="modal-body"><span class="eyebrow">${esc(t('adminDashboard'))}</span><h2>${esc(t('editCompanyInfo'))}</h2><p class="muted">${state.lang==='bn'?'এখানে পরিবর্তন করলে কোম্পানি তালিকা ও পাবলিক কোম্পানি প্রোফাইল আপডেট হবে।':'Changes made here update the Companies list and public company profile.'}</p><form id="adminCompanyEditForm" data-company-id="${esc(company.id)}"><div class="form-grid"><label class="field"><span>${esc(t('companyName'))}</span><input name="name" required value="${esc(company.name||'')}"></label><label class="field"><span>${esc(t('companyLocation'))}</span><input name="location" required value="${esc(company.location||'')}"></label><label class="field"><span>${esc(t('capacityMin'))}</span><input type="number" min="0" name="capacityMin" value="${company.worker_capacity_min||0}"></label><label class="field"><span>${esc(t('capacityMax'))}</span><input type="number" min="0" name="capacityMax" value="${company.worker_capacity_max||0}"></label><label class="field"><span>${esc(t('salaryFrom'))}</span><input type="number" min="1" max="31" name="salaryFrom" value="${company.salary_day_from||''}"></label><label class="field"><span>${esc(t('salaryTo'))}</span><input type="number" min="1" max="31" name="salaryTo" value="${company.salary_day_to||''}"></label><label class="field"><span>${esc(t('website'))}</span><input type="url" name="website" value="${esc(company.website||'')}"></label><label class="field"><span>${esc(t('officialDomain'))}</span><input name="domain" placeholder="example.com" value="${esc(company.email_domain||'')}"></label>${flag('compliance','compliance')}${flag('provident_fund','providentFund')}${flag('overtime_paid','overtimePaid')}${flag('weekly_holiday','weeklyHoliday')}${flag('festival_bonus','festivalBonus')}${flag('night_shift','nightShift')}${flag('transport','transport')}${flag('canteen','canteen')}</div><div class="form-actions"><button class="button primary" type="submit">${esc(t('save'))}</button><button class="button ghost" type="button" data-close-dialog>${esc(t('cancel'))}</button></div></form></div>`);
}

async function saveAdminCompany(form){
  const fd=new FormData(form),min=Number(fd.get('capacityMin')||0),max=Number(fd.get('capacityMax')||0);
  if(max&&min>max)throw new Error('Maximum capacity must be greater than or equal to minimum capacity.');
  const company={name:fd.get('name').trim(),location:fd.get('location').trim(),worker_capacity_min:min,worker_capacity_max:max,salary_day_from:Number(fd.get('salaryFrom')||0)||null,salary_day_to:Number(fd.get('salaryTo')||0)||null,website:fd.get('website').trim()||null,email_domain:fd.get('domain').trim().toLowerCase()||null};
  for(const key of ['compliance','provident_fund','overtime_paid','weekly_holiday','festival_bonus','night_shift','transport','canteen'])company[key]=fd.get(key)==='on';
  await rpc('admin_update_company',{p_id:form.dataset.companyId,p_company:company});
  closeModal(genericModal);showToast(t('success'));await renderAdmin();
}
function adminTableClaims(rows){
  return `<section class="admin-section"><h2>${esc(t('claims'))}</h2><table class="data-table"><thead><tr><th>Claimant</th><th>Company</th><th>Evidence</th><th>${esc(t('status'))}</th><th>${esc(t('actions'))}</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${esc(c.profiles?.full_name||c.claimant_id)}</td><td>${esc(c.companies?.name||c.company_id)}</td><td>${c.evidence_path?`<button class="neutral" data-admin-preview-proof="${esc(c.evidence_path)}" data-proof-title="${esc(c.companies?.name||'Company claim')}">View proof</button>`:'—'}</td><td>${statusBadge(c.status)}</td><td><div class="table-actions"><button class="approve" data-admin-claim-status="approved" data-id="${esc(c.id)}">${esc(t('approve'))}</button><button class="reject" data-admin-claim-status="rejected" data-id="${esc(c.id)}">${esc(t('reject'))}</button></div></td></tr>`).join('')}</tbody></table></section>`;
}
function adminTableContent(kind,rows){
  const title=kind==='reviews'?t('reviews'):kind==='jobs'?t('jobs'):t('advertise');
  return `<section class="admin-section"><h2>${esc(title)}</h2><table class="data-table"><thead><tr><th>Item</th><th>${esc(t('status'))}</th><th>${esc(t('created'))}</th><th>${esc(t('actions'))}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(kind==='reviews'?(r.companies?.name||'Review'):kind==='jobs'?r.designation:r.title)}</strong><small>${esc(kind==='reviews'?(r.is_guest?`${r.guest_name||'Guest'} · ${r.guest_email||''}`:(r.profiles?.full_name||'Anonymous')):kind==='jobs'?`${r.company_name} · ${r.deadline||'No deadline'}`:r.advertiser_name)}</small></td><td>${statusBadge(r.status)}</td><td>${formatDate(r.created_at)}</td><td><div class="table-actions"><button class="approve" data-admin-content="${kind}" data-status="approved" data-id="${esc(r.id)}">${esc(t('approve'))}</button><button class="reject" data-admin-content="${kind}" data-status="rejected" data-id="${esc(r.id)}">${esc(t('reject'))}</button><button class="delete" data-admin-content="${kind}" data-status="deleted" data-id="${esc(r.id)}">${esc(t('delete'))}</button></div></td></tr>`).join('')}</tbody></table></section>`;
}

function openAuth(mode='login',type='professional'){
  openModal(authModal,authMarkup(mode,type));
  bindAuthForm();
}
function openGuestLogin(){
  openModal(authModal,`<div class="modal-body"><span class="eyebrow">${esc(t('guestReviewer'))}</span><h2>${esc(t('guestLogin'))}</h2><div class="notice">${state.lang==='bn'?'সাইনআপ ছাড়াই review দিতে পারবেন। Review প্রকাশের আগে Admin যাচাই করবেন।':'You can review without signing up. An administrator will moderate the review before publication.'}</div><form id="guestLoginForm"><div class="form-grid"><label class="field full"><span>${esc(t('fullName'))}</span><input name="name" minlength="2" maxlength="80" required></label><label class="field full"><span>${esc(t('email'))}</span><input type="email" name="email" required></label></div><div class="form-actions"><button class="button primary full" type="submit">${esc(t('guestLogin'))}</button></div></form></div>`);
}
function saveGuestSession(form){
  const fd=new FormData(form),guest={name:fd.get('name').trim(),email:fd.get('email').trim().toLowerCase()};
  sessionStorage.setItem('prepresshub_guest',JSON.stringify(guest));state.guest=guest;closeModal(authModal);renderAuthActions();showToast(t('success'));
  if(state.pendingGuestReviewCompanyId){const companyId=state.pendingGuestReviewCompanyId;state.pendingGuestReviewCompanyId=null;openReviewForm(companyId);}
}
function openAdminLogin(){
  const adminEmail=String(config.ADMIN_EMAIL||'').trim().toLowerCase();
  openModal(authModal,`<div class="modal-body admin-login-panel"><span class="eyebrow">${esc(t('adminAccess'))}</span><h2>${esc(t('adminLogin'))}</h2><div class="notice warning">${esc(t('adminSwitchNotice'))}</div><form id="adminLoginForm"><div class="form-grid"><label class="field full"><span>${esc(t('email'))}</span><input type="email" name="email" value="${esc(adminEmail)}" readonly required></label><label class="field full"><span>${esc(t('password'))}</span><input type="password" name="password" required minlength="8" autocomplete="current-password"></label></div><div class="form-actions"><button class="button primary full" type="submit">${esc(t('adminLogin'))}</button></div></form></div>`);
}
function authMarkup(mode,type){
  return `<div class="modal-body"><span class="eyebrow">Secure access</span><h2>${esc(mode==='login'?t('login'):t('signup'))}</h2><div class="auth-tabs"><button class="${mode==='login'?'active':''}" data-auth-tab="login">${esc(t('login'))}</button><button class="${mode==='signup'?'active':''}" data-auth-tab="signup">${esc(t('signup'))}</button></div>${mode==='login'?loginForm():signupForms(type)}</div>`;
}
function loginForm(){return `<form id="loginForm"><div class="form-grid"><label class="field full"><span>${esc(t('email'))}</span><input type="email" name="email" required></label><label class="field full"><span>${esc(t('password'))}</span><input type="password" name="password" required minlength="8"></label></div><div class="form-actions"><button class="button primary full" type="submit">${esc(t('login'))}</button></div></form>`;}
function signupForms(type){
  return `<div class="auth-tabs"><button class="${type==='professional'?'active':''}" data-signup-type="professional">${esc(t('professionalSignup'))}</button><button class="${type==='company'?'active':''}" data-signup-type="company">${esc(t('companySignup'))}</button></div>${type==='professional'?professionalSignupForm():companySignupForm()}`;
}
function professionalSignupForm(){
  return `<form id="professionalSignupForm"><div class="form-grid"><label class="field"><span>${esc(t('fullName'))}</span><input name="fullName" required></label><label class="field"><span>${esc(t('email'))}</span><input type="email" name="email" required></label><label class="field"><span>${esc(t('password'))}</span><input type="password" name="password" minlength="8" required></label><label class="field"><span>${esc(t('phone'))}</span><input name="phone" required></label><label class="field"><span>${esc(t('location'))}</span><input name="location" required></label><label class="field"><span>${esc(t('currentDesignation'))}</span><input name="currentDesignation" required></label><label class="field"><span>${esc(t('currentCompany'))}</span><input name="currentCompany" id="signupCompanyInput" required><div class="suggestions" id="signupCompanySuggestions"></div></label><label class="field"><span>${esc(t('currentCompanyLocation'))}</span><input name="currentCompanyLocation" required></label><label class="field full"><span>${esc(t('uploadCv'))}</span><input type="file" name="cv" accept="application/pdf,.pdf" required></label></div><h3>${esc(t('previousExperience'))}</h3><div id="signupExperienceRows"></div><button class="button ghost small" type="button" data-add-signup-experience>${esc(t('addExperience'))}</button><div class="form-actions"><button class="button primary full" type="submit">${esc(t('signUpSubmit'))}</button></div></form>`;
}
function renderSignupExperienceRow(){
  return `<div class="form-grid experience-row"><label class="field"><span>${esc(t('companyName'))}</span><input data-signup-exp="company" required></label><label class="field"><span>${esc(t('companyLocation'))}</span><input data-signup-exp="location" required></label><label class="field"><span>${esc(t('designation'))}</span><input data-signup-exp="designation" required></label><label class="field"><span>${esc(t('from'))}</span><input type="date" data-signup-exp="from"></label><label class="field"><span>${esc(t('to'))}</span><input type="date" data-signup-exp="to"></label><button class="button danger small" type="button" data-remove-experience>${esc(t('delete'))}</button></div>`;
}
function companySignupForm(){
  return `<form id="companySignupForm"><div class="form-grid"><label class="field"><span>${esc(t('companyName'))}</span><input name="companyName" id="companySignupName" required><div class="suggestions" id="companySignupSuggestions"></div></label><label class="field"><span>${esc(t('location'))}</span><input name="location" required></label><label class="field"><span>${esc(t('contactPerson'))}</span><input name="contactPerson" required></label><label class="field"><span>${esc(t('email'))}</span><input type="email" name="email" required></label><label class="field"><span>${esc(t('password'))}</span><input type="password" name="password" minlength="8" required></label><label class="field"><span>${esc(t('phone'))}</span><input name="phone" required></label><label class="field"><span>${esc(t('capacityMin'))}</span><input type="number" name="capacityMin" min="0" required></label><label class="field"><span>${esc(t('capacityMax'))}</span><input type="number" name="capacityMax" min="1" required></label><label class="field"><span>${esc(t('salaryFrom'))}</span><input type="number" name="salaryFrom" min="1" max="31" required></label><label class="field"><span>${esc(t('salaryTo'))}</span><input type="number" name="salaryTo" min="1" max="31" required></label><label class="field"><span>${esc(t('website'))}</span><input type="url" name="website"></label><label class="field full"><span>${esc(t('proof'))}</span><input type="file" name="proof" accept="application/pdf,image/*" required></label><div class="notice field full">${state.lang==='bn'?'Administrator প্রমাণপত্র যাচাই করে official email domain সেট করবেন।':'An administrator will set the official email domain after reviewing the proof.'}</div>${['compliance','providentFund','overtimePaid','weeklyHoliday','festivalBonus','nightShift','transport','canteen'].map(key=>`<label class="check"><input type="checkbox" name="${key}"><span>${esc(t(key))}</span></label>`).join('')}</div><div class="form-actions"><button class="button primary full" type="submit">${esc(t('signUpSubmit'))}</button></div></form>`;
}
function bindAuthForm(){
  $('#signupCompanyInput')&&bindCompanySuggestions($('#signupCompanyInput'),$('#signupCompanySuggestions'));
  $('#companySignupName')&&bindCompanySuggestions($('#companySignupName'),$('#companySignupSuggestions'));
}

async function signupProfessional(form){
  const fd=new FormData(form),file=form.elements.cv.files[0],email=fd.get('email').trim();
  const employmentHistory=[{company_name:fd.get('currentCompany').trim(),location:fd.get('currentCompanyLocation').trim(),designation:fd.get('currentDesignation').trim(),is_current:true}];
  $$('#signupExperienceRows .experience-row',form).forEach(row=>employmentHistory.push({company_name:row.querySelector('[data-signup-exp="company"]').value.trim(),location:row.querySelector('[data-signup-exp="location"]').value.trim(),designation:row.querySelector('[data-signup-exp="designation"]').value.trim(),start_date:row.querySelector('[data-signup-exp="from"]').value||null,end_date:row.querySelector('[data-signup-exp="to"]').value||null,is_current:false}));
  const meta={account_type:'professional',full_name:fd.get('fullName').trim(),phone:fd.get('phone').trim(),location:fd.get('location').trim(),current_company:fd.get('currentCompany').trim(),current_company_location:fd.get('currentCompanyLocation').trim(),current_designation:fd.get('currentDesignation').trim(),employment_history:employmentHistory};
  const {data,error}=await supabase.auth.signUp({email,password:fd.get('password'),options:{emailRedirectTo:`${location.origin}${location.pathname}?next=account`,data:meta}});if(error)throw error;
  await savePendingFile(email,{type:'cv',file});
  if(data.session){await uploadPendingFile(data.user,email);}
  showToast(data.session?t('signupPending'):t('emailConfirm'));
  closeModal(authModal);
}
async function signupCompany(form){
  const fd=new FormData(form),file=form.elements.proof.files[0],email=fd.get('email').trim();
  const capacityMin=Number(fd.get('capacityMin')),capacityMax=Number(fd.get('capacityMax'));if(capacityMax<capacityMin)throw new Error('Maximum capacity must be greater than or equal to minimum capacity.');
  const meta={account_type:'company',full_name:fd.get('contactPerson').trim(),phone:fd.get('phone').trim(),location:fd.get('location').trim(),company_name:fd.get('companyName').trim(),company_location:fd.get('location').trim(),worker_capacity_min:capacityMin,worker_capacity_max:capacityMax,compliance:fd.get('compliance')==='on',provident_fund:fd.get('providentFund')==='on',salary_day_from:Number(fd.get('salaryFrom')),salary_day_to:Number(fd.get('salaryTo')),overtime_paid:fd.get('overtimePaid')==='on',weekly_holiday:fd.get('weeklyHoliday')==='on',festival_bonus:fd.get('festivalBonus')==='on',night_shift:fd.get('nightShift')==='on',transport:fd.get('transport')==='on',canteen:fd.get('canteen')==='on',website:fd.get('website').trim()};
  const {data,error}=await supabase.auth.signUp({email,password:fd.get('password'),options:{emailRedirectTo:`${location.origin}${location.pathname}?next=account`,data:meta}});if(error)throw error;
  if(file)await savePendingFile(email,{type:'proof',file});
  if(data.session&&file){await uploadPendingFile(data.user,email);}
  showToast(data.session?t('signupPending'):t('emailConfirm'));
  closeModal(authModal);
}
async function login(form){
  const fd=new FormData(form);const {error}=await supabase.auth.signInWithPassword({email:fd.get('email').trim(),password:fd.get('password')});if(error)throw error;await refreshAuth();closeModal(authModal);showToast(t('success'));location.hash=state.profile?.role==='admin'?'#admin':'#account';
}
async function adminLogin(form){
  const adminEmail=String(config.ADMIN_EMAIL||'').trim().toLowerCase();
  if(!adminEmail)throw new Error(t('adminEmailMissing'));
  if(state.session){const {error:signOutError}=await supabase.auth.signOut();if(signOutError)throw signOutError;await refreshAuth();}
  const fd=new FormData(form),{error}=await supabase.auth.signInWithPassword({email:adminEmail,password:fd.get('password')});if(error)throw error;
  await refreshAuth();
  if(String(state.user?.email||'').trim().toLowerCase()!==adminEmail||state.profile?.role!=='admin'){
    await supabase.auth.signOut();await refreshAuth();throw new Error(t('adminVerificationFailed'));
  }
  closeModal(authModal);showToast(t('success'));location.hash='#admin';
}

async function uploadPendingFile(user,email){
  const pending=await getPendingFile(email);if(!pending)return;
  if(pending.type==='cv'){
    const ext=pending.file.name.split('.').pop().toLowerCase();const path=`${user.id}/cv-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from('cvs').upload(path,pending.file,{upsert:true});if(error)throw error;
    const now=new Date().toISOString();
    const {error:privateError}=await supabase.from('profile_private').upsert({id:user.id,cv_path:path,updated_at:now},{onConflict:'id'});if(privateError)throw privateError;
    const {error:profileError}=await supabase.from('profiles').update({has_cv:true,updated_at:now}).eq('id',user.id);if(profileError)throw profileError;
  }else if(pending.type==='proof'){
    const {data:profile,error:profileReadError}=await supabase.from('profiles').select('company_id').eq('id',user.id).single();if(profileReadError)throw profileReadError;
    if(profile?.company_id){
      const ext=pending.file.name.split('.').pop().toLowerCase();const path=`${user.id}/company-proof-${Date.now()}.${ext}`;
      const {error}=await supabase.storage.from('company-proofs').upload(path,pending.file,{upsert:true});if(error)throw error;
      const {data:company,error:companyReadError}=await supabase.from('companies').select('id,claimed_by').eq('id',profile.company_id).single();if(companyReadError)throw companyReadError;
      if(company.claimed_by===user.id){
        const {error:privateError}=await supabase.from('company_private').upsert({company_id:company.id,proof_path:path,updated_at:new Date().toISOString()},{onConflict:'company_id'});if(privateError)throw privateError;
      }else{
        const {error:claimError}=await supabase.from('company_claims').update({evidence_path:path,updated_at:new Date().toISOString()}).eq('company_id',company.id).eq('claimant_id',user.id).eq('status','pending');if(claimError)throw claimError;
      }
    }
  }
  await deletePendingFile(email);
}
async function completePendingUpload(){ if(state.user)try{await uploadPendingFile(state.user,state.user.email);}catch(error){console.error(error);showToast(t('fileUploadFailed'),'error');} }

const pendingDb={name:'prepresshub-pending-files',store:'files'};
function openPendingDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(pendingDb.name,1);req.onupgradeneeded=()=>req.result.createObjectStore(pendingDb.store,{keyPath:'email'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function savePendingFile(email,data){const db=await openPendingDb();return new Promise((resolve,reject)=>{const tx=db.transaction(pendingDb.store,'readwrite');tx.objectStore(pendingDb.store).put({email,...data});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function getPendingFile(email){const db=await openPendingDb();return new Promise((resolve,reject)=>{const req=db.transaction(pendingDb.store).objectStore(pendingDb.store).get(email);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function deletePendingFile(email){const db=await openPendingDb();return new Promise((resolve,reject)=>{const tx=db.transaction(pendingDb.store,'readwrite');tx.objectStore(pendingDb.store).delete(email);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}

async function bindCompanySuggestions(input,container){
  let timer;input.addEventListener('input',()=>{clearTimeout(timer);container.innerHTML='';if(input.value.trim().length<2)return;timer=setTimeout(async()=>{try{const matches=await rpc('find_company_matches',{p_name:input.value.trim()});container.innerHTML=(matches||[]).slice(0,5).map(m=>`<button type="button" class="suggestion" data-company-name="${esc(m.name)}"><strong>${esc(m.name)}</strong><small> · ${esc(m.location||'')}</small></button>`).join('');}catch(error){console.error(error);}},300);});container.addEventListener('click',e=>{const b=e.target.closest('[data-company-name]');if(!b)return;input.value=b.dataset.companyName;container.innerHTML='';});
}

async function saveProfile(form){
  const fd=new FormData(form),file=form.elements.cv.files[0],avatarFile=form.elements.avatar.files[0];let cvPath=state.profile?.cv_path||null,avatarPath=state.profile?.avatar_path||null;
  if(file){const ext=file.name.split('.').pop().toLowerCase();cvPath=`${state.user.id}/cv-${Date.now()}.${ext}`;const {error}=await supabase.storage.from('cvs').upload(cvPath,file,{upsert:true});if(error)throw error;}
  if(avatarFile){
    if(avatarFile.size>3*1024*1024)throw new Error(t('photoHelp'));
    const ext=avatarFile.name.split('.').pop().toLowerCase();if(!['jpg','jpeg','png','webp'].includes(ext))throw new Error(t('photoHelp'));
    const newPath=`${state.user.id}/avatar-${Date.now()}.${ext}`;const {error}=await supabase.storage.from('avatars').upload(newPath,avatarFile,{upsert:false});if(error)throw error;
    if(avatarPath)await supabase.storage.from('avatars').remove(avatarPath);avatarPath=newPath;
  }else if(fd.get('removeAvatar')==='on'&&avatarPath){await supabase.storage.from('avatars').remove(avatarPath);avatarPath=null;}
  const currentCompany=String(fd.get('currentCompany')||'').trim(),currentDesignation=String(fd.get('currentDesignation')||'').trim(),currentCompanyLocation=String(fd.get('currentCompanyLocation')||'').trim();
  const skills=fd.get('skills').split(',').map(x=>x.trim()).filter(Boolean);const completion=calculateCompletion({fullName:fd.get('fullName'),phone:fd.get('phone'),location:fd.get('location'),skills,currentCompany,currentDesignation,cvPath});
  const now=new Date().toISOString();
  const {error}=await supabase.from('profiles').update({full_name:fd.get('fullName').trim(),location:fd.get('location').trim(),skills,bio:fd.get('bio').trim(),portfolio_url:fd.get('portfolio').trim(),avatar_path:avatarPath,has_cv:Boolean(cvPath),profile_completion:completion,updated_at:now}).eq('id',state.user.id);if(error)throw error;
  const {error:privateError}=await supabase.from('profile_private').upsert({id:state.user.id,phone:fd.get('phone').trim(),cv_path:cvPath,updated_at:now},{onConflict:'id'});if(privateError)throw privateError;
  if(form.dataset.manageEmployment==='true'&&currentCompany&&currentDesignation){
    const previous=[];
    $$('#experienceRows .experience-row',form).forEach(row=>{const company=row.querySelector('[data-exp="company"]').value.trim(),designation=row.querySelector('[data-exp="designation"]').value.trim();if(company&&designation)previous.push({company_name:company,location:row.querySelector('[data-exp="location"]').value.trim(),designation,start_date:row.querySelector('[data-exp="from"]').value||null,end_date:row.querySelector('[data-exp="to"]').value||null});});
    await rpc('replace_employment_history',{p_current_company_name:currentCompany,p_current_company_location:currentCompanyLocation,p_current_designation:currentDesignation,p_previous:previous});
  }
  await rpc('sync_company_email_badge',{p_user_id:state.user.id});await refreshAuth();showToast(t('profileSaved'));renderAccount();
}
function calculateCompletion(data){const fields=[data.fullName,data.phone,data.location,data.skills?.length,data.currentCompany,data.currentDesignation,data.cvPath];return Math.round(fields.filter(Boolean).length/fields.length*100);}
async function saveCompanyProfile(form){
  const fd=new FormData(form);const min=Number(fd.get('capacityMin')||0),max=Number(fd.get('capacityMax')||0);if(max&&min>max)throw new Error('Maximum capacity must be greater than or equal to minimum capacity.');const update={location:fd.get('location').trim(),worker_capacity_min:min,worker_capacity_max:max,salary_day_from:Number(fd.get('salaryFrom')||0)||null,salary_day_to:Number(fd.get('salaryTo')||0)||null,website:fd.get('website').trim(),compliance:fd.get('compliance')==='on',provident_fund:fd.get('provident_fund')==='on',overtime_paid:fd.get('overtime_paid')==='on',weekly_holiday:fd.get('weekly_holiday')==='on',festival_bonus:fd.get('festival_bonus')==='on',night_shift:fd.get('night_shift')==='on',transport:fd.get('transport')==='on',canteen:fd.get('canteen')==='on',updated_at:new Date().toISOString()};const {error}=await supabase.from('companies').update(update).eq('id',state.company.id);if(error)throw error;await refreshAuth();showToast(t('companySaved'));renderAccount();
}

async function previewCv(profileId){
  if(!requireApproved() && state.profile?.role!=='admin')return;
  const [{data:profile,error},{data:cvPath,error:pathError}]=await Promise.all([
    supabase.from('profiles').select('full_name,has_cv').eq('id',profileId).maybeSingle(),
    supabase.rpc('get_cv_path',{p_user_id:profileId})
  ]);
  if(error||pathError||!profile?.has_cv||!cvPath)return showToast(t('error'),'error');
  const {data,error:signedError}=await supabase.storage.from('cvs').createSignedUrl(cvPath,120);if(signedError)throw signedError;openModal(genericModal,`<div class="modal-body"><span class="eyebrow">${esc(t('previewCv'))}</span><h2>${esc(profile.full_name||'CV')}</h2><div class="notice warning">${esc(t('noDownload'))}</div><iframe class="cv-frame" src="${esc(data.signedUrl)}#toolbar=0&navpanes=0&scrollbar=1"></iframe></div>`);
}
async function previewCompanyProof(path,title='Company proof'){
  if(state.profile?.role!=='admin')return showToast(t('adminOnly'),'error');
  const {data,error}=await supabase.storage.from('company-proofs').createSignedUrl(path,120);if(error)throw error;
  const isImage=/\.(png|jpe?g|webp)$/i.test(path);
  const viewer=isImage?`<img src="${esc(data.signedUrl)}" alt="${esc(title)}" style="display:block;max-width:100%;max-height:72vh;margin:auto;border-radius:14px">`:`<iframe class="cv-frame" src="${esc(data.signedUrl)}#toolbar=0&navpanes=0&scrollbar=1"></iframe>`;
  openModal(genericModal,`<div class="modal-body"><span class="eyebrow">Verification document</span><h2>${esc(title)}</h2><div class="notice warning">Private administrator preview. Do not redistribute this document.</div>${viewer}</div>`);
}

async function openJobForm(){
  if(!canPostVerifiedJob())return showToast(state.lang==='bn'?'Verified company email প্রয়োজন।':'A verified company email is required.','error');
  const isAdmin=state.profile?.role==='admin';
  const companies=isAdmin?await query('companies',{eq:{status:'approved'},order:{column:'name'},limit:500}):(state.company?[state.company]:[]);
  if(!companies.length)return showToast(state.lang==='bn'?'Approved company পাওয়া যায়নি।':'No approved company is available.','error');
  const options=companies.map(company=>`<option value="${esc(company.id)}" data-location="${esc(company.location||'')}">${esc(company.name)}</option>`).join('');
  const minDeadline=new Date().toISOString().slice(0,10);
  openModal(genericModal,`<div class="modal-body"><span class="eyebrow">Job circular</span><h2>${esc(t('postJob'))}</h2><div class="notice warning">${state.lang==='bn'?'চাকরিটি Admin অনুমোদনের পর প্রকাশিত হবে। Deadline শেষ হলে application method স্বয়ংক্রিয়ভাবে lock হবে।':'The job will be published after administrator approval. Application methods lock automatically after the deadline.'}</div><form id="jobForm"><div class="form-grid"><label class="field"><span>${esc(t('companyName'))}</span><select name="companyId" id="jobCompanySelect" required>${options}</select></label><label class="field"><span>${esc(t('location'))}</span><input id="jobLocationInput" name="location" required value="${esc(companies[0].location||'')}"></label><label class="field"><span>${esc(t('salary'))}</span><input name="salary" required></label><label class="field"><span>${esc(t('designation'))}</span><input name="designation" required></label><label class="field"><span>${esc(t('deadline'))}</span><input type="date" name="deadline" min="${minDeadline}" required></label><label class="field"><span>${esc(t('applyEmail'))}</span><input type="email" name="applyEmail" required value="${esc(state.user?.email||'')}"></label><label class="field"><span>${esc(t('whatsapp'))}</span><input type="tel" name="whatsapp" required placeholder="8801XXXXXXXXX" value="${esc(state.profile?.phone||'')}"></label><label class="field full"><span>${esc(t('description'))}</span><textarea name="description" required></textarea></label></div><label class="check"><input type="checkbox" name="truth" required><span>${esc(t('truthConfirm'))}</span></label><div class="form-actions"><button class="button primary full" type="submit">${esc(t('submit'))}</button></div></form></div>`);
  $('#jobCompanySelect')?.addEventListener('change',event=>{$('#jobLocationInput').value=event.target.selectedOptions[0]?.dataset.location||'';});
}
function canPostVerifiedJob(){return Boolean(state.user&&(state.profile?.role==='admin'||(state.profile?.status==='approved'&&state.profile?.company_email_verified&&state.company?.status==='approved'&&state.profile?.company_id===state.company?.id)));}
async function submitJob(form){
  if(!canPostVerifiedJob())throw new Error('A verified company email is required.');
  const fd=new FormData(form),companyId=fd.get('companyId');
  const {data:company,error:companyError}=await supabase.from('companies').select('*').eq('id',companyId).maybeSingle();
  if(companyError||!company)throw companyError||new Error('Company not found.');
  const deadline=fd.get('deadline'),whatsapp=fd.get('whatsapp').trim();
  if(new Date(`${deadline}T23:59:59`).getTime()<Date.now())throw new Error('Application deadline cannot be in the past.');
  if(String(whatsapp).replace(/\D/g,'').length<10)throw new Error('Enter a valid WhatsApp number with country code.');
  const {error}=await supabase.from('jobs').insert({poster_id:state.user.id,company_id:company.id,company_name:company.name,location:fd.get('location').trim(),salary:fd.get('salary').trim(),designation:fd.get('designation').trim(),deadline,apply_email:fd.get('applyEmail').trim().toLowerCase(),whatsapp_number:whatsapp,description:fd.get('description').trim(),is_real_confirmed:true,status:'pending'});if(error)throw error;
  showToast(t('jobPending'));closeModal(genericModal);renderJobs();
}
function openAdForm(){
  if(!requireApproved())return;openModal(genericModal,`<div class="modal-body"><span class="eyebrow">Industry advertising</span><h2>${esc(t('submitAd'))}</h2><form id="adForm"><div class="form-grid"><label class="field"><span>${esc(t('advertiser'))}</span><input name="advertiser" required value="${esc(state.company?.name||state.profile?.full_name||'')}"></label><label class="field"><span>${esc(t('email'))}</span><input type="email" name="email" required value="${esc(state.user.email||'')}"></label><label class="field"><span>${esc(t('phone'))}</span><input name="phone" required value="${esc(state.profile?.phone||'')}"></label><label class="field"><span>${esc(t('placement'))}</span><select name="placement"><option value="homepage">${esc(t('homepage'))}</option><option value="directory">${esc(t('directory'))}</option><option value="company">${esc(t('companyPage'))}</option></select></label><label class="field full"><span>${esc(t('adTitle'))}</span><input name="title" required></label><label class="field full"><span>${esc(t('description'))}</span><textarea name="description" required></textarea></label><label class="field full"><span>${esc(t('targetUrl'))}</span><input type="url" name="targetUrl"></label><label class="field full"><span>${esc(t('banner'))}</span><input type="file" name="banner" accept="image/png,image/jpeg,image/webp" required></label></div><label class="check"><input type="checkbox" name="truth" required><span>${esc(t('truthConfirm'))}</span></label><div class="form-actions"><button class="button primary full" type="submit">${esc(t('submit'))}</button></div></form></div>`);
}
async function submitAd(form){const fd=new FormData(form),file=form.elements.banner.files[0],target=fd.get('targetUrl').trim();if(target){const parsed=new URL(target);if(!['http:','https:'].includes(parsed.protocol))throw new Error('Only HTTP or HTTPS destination links are allowed.');}const ext=file.name.split('.').pop().toLowerCase(),path=`${state.user.id}/ad-${crypto.randomUUID()}.${ext}`;const {error:uploadError}=await supabase.storage.from('ad-banners').upload(path,file,{upsert:false});if(uploadError)throw uploadError;const {error}=await supabase.from('advertisements').insert({poster_id:state.user.id,title:fd.get('title').trim(),advertiser_name:fd.get('advertiser').trim(),contact_email:fd.get('email').trim(),phone:fd.get('phone').trim(),placement:fd.get('placement'),description:fd.get('description').trim(),target_url:target||null,banner_path:path,status:'pending'});if(error)throw error;showToast(t('adPending'));closeModal(genericModal);renderAdvertisements();}
function openReviewForm(companyId){
  if(!state.user&&!state.guest){state.pendingGuestReviewCompanyId=companyId;openGuestLogin();return;}
  if(state.user&&!requireApproved())return;
  const guestNotice=state.guest&&!state.user?`<div class="notice warning">${state.lang==='bn'?`${esc(state.guest.name)} হিসেবে guest review দিচ্ছেন। একই Email থেকে একই কোম্পানিতে ২৪ ঘণ্টায় একটি review দেওয়া যাবে।`:`Reviewing as guest ${esc(state.guest.name)}. One review per company is allowed from the same email every 24 hours.`}</div>`:'';
  openModal(genericModal,`<div class="modal-body"><span class="eyebrow">Company review</span><h2>${esc(t('writeReview'))}</h2>${guestNotice}<form id="reviewForm" data-company-id="${esc(companyId)}"><div class="form-grid"><label class="field"><span>Employment</span><select name="employment"><option value="current">${esc(t('currentEmployee'))}</option><option value="former">${esc(t('formerEmployee'))}</option></select></label><label class="field"><span>${esc(t('teamLead'))}</span><input name="teamLeadName" required maxlength="120"></label>${[['salaryBenefits','salary_benefits'],['workEnvironment','work_environment'],['management','management'],['careerGrowth','career_growth'],['workLife','work_life_balance'],['teamLeadRating','team_lead_rating']].map(([label,name])=>`<label class="field"><span>${esc(t(label))}</span><select name="${name}" required>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label>`).join('')}<label class="check"><input type="checkbox" name="nightShift"><span>${esc(t('nightShift'))}</span></label><label class="check"><input type="checkbox" name="anonymous" ${state.guest&&!state.user?'checked':''}><span>${esc(t('anonymous'))}</span></label><label class="field full"><span>${esc(t('pros'))}</span><textarea name="pros" required maxlength="2000"></textarea></label><label class="field full"><span>${esc(t('cons'))}</span><textarea name="cons" required maxlength="2000"></textarea></label><label class="field full"><span>${esc(t('advice'))}</span><textarea name="advice" maxlength="2000"></textarea></label></div><div class="form-actions"><button class="button primary full" type="submit">${esc(t('submitReview'))}</button></div></form></div>`);
}
async function submitReview(form){
  const fd=new FormData(form),review={company_id:form.dataset.companyId,is_anonymous:fd.get('anonymous')==='on',employment_status:fd.get('employment'),team_leader_name:fd.get('teamLeadName').trim(),night_shift:fd.get('nightShift')==='on',salary_benefits:Number(fd.get('salary_benefits')),work_environment:Number(fd.get('work_environment')),management:Number(fd.get('management')),career_growth:Number(fd.get('career_growth')),work_life_balance:Number(fd.get('work_life_balance')),team_lead_rating:Number(fd.get('team_lead_rating')),pros:fd.get('pros').trim(),cons:fd.get('cons').trim(),advice:fd.get('advice').trim(),status:'pending'};
  if(state.user){const {error}=await supabase.from('reviews').insert({...review,reviewer_id:state.user.id});if(error)throw error;}
  else if(state.guest){const {error}=await supabase.guestReview({guest:state.guest,review});if(error)throw error;}
  else throw new Error('Guest or user access is required.');
  showToast(t('reviewPending'));closeModal(genericModal);renderCompany(form.dataset.companyId);
}

async function adminStatus(kind,id,status){await rpc(kind,{p_id:id,p_status:status});showToast(t('success'));renderAdmin();}
async function adminModerate(kind,id,status){await rpc('admin_moderate_content',{p_kind:kind,p_id:id,p_status:status});showToast(t('success'));renderAdmin();}

async function handleClick(event){
  const target=event.target.closest('button,a');if(!target)return;
  if(target.matches('[data-guest-login]')){openGuestLogin();return;}
  if(target.matches('[data-guest-logout]')){sessionStorage.removeItem('prepresshub_guest');state.guest=null;renderAuthActions();showToast(t('success'));return;}
  if(target.matches('[data-admin-login]')){event.preventDefault();openAdminLogin();return;}
  if(target.matches('[data-auth]')){event.preventDefault();openAuth(target.dataset.auth);return;}
  if(target.matches('[data-logout]')){await supabase.auth.signOut();await refreshAuth();location.hash='#home';showToast(t('success'));return;}
  if(target.matches('[data-close-dialog]')){closeModal(target.closest('dialog'));return;}
  if(target.matches('[data-auth-tab]')){authModalContent.innerHTML=authMarkup(target.dataset.authTab);bindAuthForm();return;}
  if(target.matches('[data-signup-type]')){authModalContent.innerHTML=authMarkup('signup',target.dataset.signupType);bindAuthForm();return;}
  if(target.matches('[data-view-job]')){await viewJob(target.dataset.viewJob);return;}
  if(target.matches('[data-preview-cv]')){previewCv(target.dataset.previewCv);return;}
  if(target.matches('[data-admin-preview-cv]')){previewCv(target.dataset.adminPreviewCv);return;}
  if(target.matches('[data-open-job]')){await openJobForm();return;}
  if(target.matches('[data-open-ad]')){openAdForm();return;}
  if(target.matches('[data-review-company]')){openReviewForm(target.dataset.reviewCompany);return;}
  if(target.matches('[data-add-signup-experience]')){$('#signupExperienceRows').insertAdjacentHTML('beforeend',renderSignupExperienceRow());return;}
  if(target.matches('[data-add-experience]')){$('#experienceRows').insertAdjacentHTML('beforeend',renderExperienceRow());return;}
  if(target.matches('[data-remove-experience]')){target.closest('.experience-row').remove();return;}
  if(target.matches('[data-admin-preview-proof]')){await previewCompanyProof(target.dataset.adminPreviewProof,target.dataset.proofTitle||'Company proof');return;}
  if(target.matches('[data-admin-edit-company]')){await openAdminCompanyEditor(target.dataset.adminEditCompany);return;}
  if(target.matches('[data-admin-company-domain]')){const value=prompt('Verified company email domain (leave blank to clear):',target.dataset.currentDomain||'');if(value===null)return;await rpc('admin_set_company_domain',{p_id:target.dataset.adminCompanyDomain,p_domain:value.trim()||null});showToast(t('success'));renderAdmin();return;}
  if(target.matches('[data-admin-profile-status]')){if(confirm('Continue?'))await adminStatus('admin_set_profile_status',target.dataset.id,target.dataset.adminProfileStatus);return;}
  if(target.matches('[data-admin-company-status]')){if(confirm('Continue?'))await adminStatus('admin_set_company_status',target.dataset.id,target.dataset.adminCompanyStatus);return;}
  if(target.matches('[data-admin-claim-status]')){if(confirm('Continue?'))await rpc('admin_set_claim_status',{p_id:target.dataset.id,p_status:target.dataset.adminClaimStatus}),renderAdmin();return;}
  if(target.matches('[data-admin-delete-profile]')){if(confirm('Delete this account permanently?'))await rpc('admin_delete_profile',{p_id:target.dataset.adminDeleteProfile}),renderAdmin();return;}
  if(target.matches('[data-admin-delete-company]')){if(confirm('Delete this company?'))await rpc('admin_delete_company',{p_id:target.dataset.adminDeleteCompany}),renderAdmin();return;}
  if(target.matches('[data-admin-content]')){if(confirm('Continue?'))await adminModerate(target.dataset.adminContent,target.dataset.id,target.dataset.status);return;}
}
async function handleSubmit(event){
  event.preventDefault();const form=event.target;
  try{
    if(form.id==='globalSearch'){location.hash=`#companies?q=${encodeURIComponent(new FormData(form).get('q'))}`;return;}
    if(form.id==='adminLoginForm'){await adminLogin(form);return;}
    if(form.id==='guestLoginForm'){saveGuestSession(form);return;}
    if(form.id==='loginForm'){await login(form);return;}
    if(form.id==='professionalSignupForm'){await signupProfessional(form);return;}
    if(form.id==='companySignupForm'){await signupCompany(form);return;}
    if(form.id==='profileForm'){await saveProfile(form);return;}
    if(form.id==='companyProfileForm'){await saveCompanyProfile(form);return;}
    if(form.id==='adminCompanyEditForm'){await saveAdminCompany(form);return;}
    if(form.id==='adminCreateCompanyForm'){await createAdminCompany(form);return;}
    if(form.id==='jobForm'){await submitJob(form);return;}
    if(form.id==='adForm'){await submitAd(form);return;}
    if(form.id==='reviewForm'){await submitReview(form);return;}
    if(form.id==='mergeForm'){const fd=new FormData(form);if(fd.get('source')===fd.get('target'))throw new Error('Source and target must be different.');if(confirm('Merge companies?'))await rpc('admin_merge_companies',{p_source:fd.get('source'),p_target:fd.get('target')}),renderAdmin();return;}
  }catch(error){console.error(error);showToast(error.message||t('error'),'error');}
}

async function boot(){
  document.body.dataset.lang=state.lang;document.documentElement.lang=state.lang;$('#languageButton').textContent=state.lang==='bn'?'EN':'BN';applyStaticTranslations();
  $('#languageButton').addEventListener('click',()=>setLanguage(state.lang==='bn'?'en':'bn'));
  $('#menuButton').addEventListener('click',()=>{const open=$('#mobileNav').classList.toggle('open');$('#menuButton').setAttribute('aria-expanded',String(open));});
  document.addEventListener('click',handleClick);document.addEventListener('submit',handleSubmit);
  $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('dialog'))));
  window.addEventListener('hashchange',()=>{ $('#mobileNav').classList.remove('open');$('#menuButton').setAttribute('aria-expanded','false');renderRoute(); });
  if(isConfigured){
    supabase.auth.onAuthStateChange(async()=>{await refreshAuth();renderRoute();});
    await refreshAuth();
    const next=new URLSearchParams(location.search).get('next');
    if(next){history.replaceState({},'',location.pathname+location.hash);if(next==='account')location.hash='#account';}
  }else renderAuthActions();
  await renderRoute();
}

boot().catch(error=>{console.error(error);app.innerHTML=`<section class="page-hero"><div class="container"><div class="notice danger"><strong>${esc(t('error'))}</strong><p>${esc(error.message||error)}</p></div></div></section>`;});
