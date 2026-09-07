import { repo } from "../src/lib/repository";
import type { Volunteer, ExtractedProfile } from "../src/lib/types";
import { profileEmbeddingText, hashEmbed } from "../src/lib/ai";
import { computeScore, makeSessionEvent } from "../src/lib/score-engine";

interface SeedSpec {
  id: string; name: string; phone: string; gender: string; dob: string;
  languages: Array<[string, "basic" | "conversational" | "fluent" | "native"]>;
  skills: Array<[string, Volunteer["skills"][0]["category"], number, boolean?]>;
  interests: string[];
  locations: string[];
  slots: string[];
  certs?: Array<[string, string]>; // [title, category]
  sessions?: number; // volunteering sessions -> builds score
  transcript: string;
}

const SEEDS: SeedSpec[] = [
  { id: "d_raju", name: "Raju Wagh", phone: "9822001101", gender: "male", dob: "1988-04-12",
    languages: [["Marathi", "native"], ["Hindi", "fluent"]],
    skills: [["lifeguard", "safety", 0.98, true], ["swimming", "safety", 0.95, true], ["rescue", "safety", 0.85]],
    interests: ["Lifeguard"], locations: ["Ramkund", "Godavari Ghats"], slots: ["Morning (8-12)", "Evening (16-20)"],
    certs: [["Swimming / Lifesaving Certificate", "safety"]], sessions: 6,
    transcript: "मी राजू वाघ. रामकुंडजवळ पोहणे शिकवतो, लाइफगार्ड आहे. मराठी हिंदी येतात." },
  { id: "d_sunanda", name: "Sunanda Pawar", phone: "9822001102", gender: "female", dob: "1992-09-30",
    languages: [["Marathi", "native"], ["Hindi", "native"], ["Telugu", "conversational"]],
    skills: [["first aid", "medical", 0.95, true], ["nursing", "medical", 0.9]],
    interests: ["First-aid support"], locations: ["Panchavati", "Kalaram Temple"], slots: ["Morning (8-12)", "Afternoon (12-16)"],
    certs: [["First Aid / Medical Certificate", "medical"]], sessions: 4,
    transcript: "मी सुनंदा पवार, नर्स आहे. प्राथमिक उपचार प्रशिक्षित. पंचवटी परिसरात सेवा करते." },
  { id: "d_imran", name: "Imran Sheikh", phone: "9822001103", gender: "male", dob: "1995-02-17",
    languages: [["Hindi", "native"], ["Urdu", "native"], ["Marathi", "fluent"], ["English", "conversational"]],
    skills: [["language helper", "language", 0.92], ["crowd guidance", "crowd", 0.8]],
    interests: ["Language helper", "Crowd guide"], locations: ["Nashik Road Railway Station", "Central Bus Stand"], slots: ["Full day"],
    sessions: 5,
    transcript: "Main Imran Sheikh. Char bhasha bolta hoon — Hindi, Urdu, Marathi, English. Railway station pe pilgrims ko guide karta hoon." },
  { id: "d_vaishali", name: "Vaishali Jadhav", phone: "9822001104", gender: "female", dob: "1999-11-05",
    languages: [["Marathi", "native"], ["English", "fluent"], ["Gujarati", "conversational"]],
    skills: [["crowd management", "crowd", 0.88], ["queue management", "crowd", 0.85], ["tech support", "technical", 0.7]],
    interests: ["Queue management", "Tech support desk"], locations: ["Trimbakeshwar Temple"], slots: ["Evening (16-20)"],
    sessions: 3,
    transcript: "Mi Vaishali. Trimbakeshwar la queue manage karte. Engineering student, tech support pan karte." },
  { id: "d_ankush", name: "Ankush Nikam", phone: "9822001105", gender: "male", dob: "1985-06-21",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["driving", "logistics", 0.95], ["route navigation", "logistics", 0.9], ["transport coordination", "logistics", 0.85]],
    interests: ["Route navigation helper"], locations: ["Nashik Road", "Muktidham"], slots: ["Full day"],
    sessions: 8,
    transcript: "Mi Ankush Nikam, driver. Nashik Road station raodha. Full day available." },
  { id: "d_kavita", name: "Kavita Sonawane", phone: "9822001106", gender: "female", dob: "1993-03-08",
    languages: [["Marathi", "native"], ["Hindi", "fluent"], ["English", "fluent"]],
    skills: [["lost-child assistance", "crowd", 0.9], ["child care", "other", 0.85], ["counselling", "other", 0.8]],
    interests: ["Lost-child assistance"], locations: ["Ramkund", "Panchavati"], slots: ["Morning (8-12)"],
    sessions: 4,
    transcript: "Mi Kavita. Mulanna shodhne, tyanca boy_ke karte. Anganwadi worker." },
  { id: "d_prakash", name: "Prakash Bhoir", phone: "9822001107", gender: "male", dob: "1979-12-01",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["sanitation", "logistics", 0.92], ["waste management", "logistics", 0.9], ["first aid", "medical", 0.6]],
    interests: ["Sanitation steward"], locations: ["Kalaram Temple", "Godavari Ghats"], slots: ["Early morning (4-8)", "Morning (8-12)"],
    sessions: 9,
    transcript: "Mi Prakash. Swachhata karya. Ghats cleaning. Sakali 4 vajta yeto." },
  { id: "d_neha", name: "Neha Kulkarni", phone: "9822001108", gender: "female", dob: "2000-08-14",
    languages: [["Marathi", "native"], ["English", "native"], ["Hindi", "fluent"], ["French", "basic"]],
    skills: [["language helper", "language", 0.85], ["translation", "language", 0.9], ["tour guidance", "crowd", 0.75]],
    interests: ["Language helper", "Crowd guide"], locations: ["Trimbakeshwar Temple", "Panchavati"], slots: ["Morning (8-12)", "Evening (16-20)"],
    sessions: 2,
    transcript: "I am Neha. Trilingual guide. English fluent, Marathi native. Foreign pilgrims la guide karte." },
  { id: "d_sameer", name: "Sameer Deshpande", phone: "9822001109", gender: "male", dob: "1991-05-25",
    languages: [["Marathi", "native"], ["Hindi", "fluent"]],
    skills: [["paramedic", "medical", 0.95, true], ["emergency response", "medical", 0.9], ["ambulance coordination", "medical", 0.85]],
    interests: ["First-aid support"], locations: ["Central Bus Stand", "Nashik Road"], slots: ["Night (20-24)"],
    certs: [["First Aid / Medical Certificate", "medical"]], sessions: 7,
    transcript: "Mi Sameer Deshpande, paramedic. Ratriche duty. Emergency response expert." },
  { id: "d_rekha", name: "Rekha Shinde", phone: "9822001110", gender: "female", dob: "1996-01-19",
    languages: [["Marathi", "native"], ["Hindi", "fluent"], ["Kannada", "conversational"]],
    skills: [["sign language", "language", 0.95, true], ["accessibility support", "other", 0.85], ["elderly support", "other", 0.9]],
    interests: ["Elderly & accessibility support", "Language helper"], locations: ["Panchavati", "Ramkund"], slots: ["Afternoon (12-16)"],
    certs: [["Language Proficiency Certificate", "language"]], sessions: 3,
    transcript: "Mi Rekha Shinde. Sign language expert. Vrudha bhaktanna madat karte." },
  { id: "d_vitthal", name: "Vitthal More", phone: "9822001111", gender: "male", dob: "1982-10-10",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["crowd management", "crowd", 0.9], ["banner holding", "crowd", 0.8], ["queue management", "crowd", 0.88]],
    interests: ["Crowd guide", "Queue management"], locations: ["Trimbakeshwar Temple", "Someshwar Ghat"], slots: ["Full day"],
    sessions: 10,
    transcript: "Mi Vitthal More. Gardi vyavastha. Trimbakeshwar la 10 varsha seva." },
  { id: "d_fatima", name: "Fatima Ansari", phone: "9822001112", gender: "female", dob: "1997-07-07",
    languages: [["Hindi", "native"], ["Urdu", "fluent"], ["Marathi", "fluent"], ["Bengali", "conversational"]],
    skills: [["language helper", "language", 0.9], ["lost-child assistance", "crowd", 0.8], ["first aid", "medical", 0.7]],
    interests: ["Language helper", "Lost-child assistance"], locations: ["Nashik Road Railway Station"], slots: ["Morning (8-12)", "Evening (16-20)"],
    sessions: 5,
    transcript: "Main Fatima. Hindi Urdu Bengali Marathi. Station pe help desk." },
  { id: "d_ganesh", name: "Ganesh Chavan", phone: "9822001113", gender: "male", dob: "1994-04-04",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["swimming", "safety", 0.9], ["boat handling", "safety", 0.85], ["rescue", "safety", 0.8]],
    interests: ["Lifeguard"], locations: ["Ramkund", "Kapila Sangam Ghat"], slots: ["Morning (8-12)"],
    sessions: 4,
    transcript: "Mi Ganesh. Ramkund la swim coach. Boat handling yete." },
  { id: "d_alok", name: "Alok Verma", phone: "9822001114", gender: "male", dob: "1998-09-09",
    languages: [["Hindi", "native"], ["English", "fluent"], ["Marathi", "basic"]],
    skills: [["tech support", "technical", 0.92], ["network setup", "technical", 0.88], ["data entry", "technical", 0.8]],
    interests: ["Tech support desk"], locations: ["Central Bus Stand", "Dwarka"], slots: ["Evening (16-20)", "Night (20-24)"],
    sessions: 2,
    transcript: "IT engineer. Network aur tech support. Control room kaam kar sakta hoon." },
  { id: "d_shobha", name: "Shobha Gaikwad", phone: "9822001115", gender: "female", dob: "1986-02-28",
    languages: [["Marathi", "native"], ["Hindi", "fluent"]],
    skills: [["food distribution", "logistics", 0.9], ["crowd serving", "crowd", 0.85], ["sanitation", "logistics", 0.75]],
    interests: ["Sanitation steward"], locations: ["Trimbakeshwar Temple", "Ramkund"], slots: ["Afternoon (12-16)", "Evening (16-20)"],
    sessions: 6,
    transcript: "Mi Shobha. Bhandara seva, anna vitaran. Trimbakeshwar ani Ramkund." },
  { id: "d_mohan", name: "Mohan Patil", phone: "9822001116", gender: "male", dob: "1975-11-11",
    languages: [["Marathi", "native"], ["Hindi", "fluent"], ["English", "conversational"]],
    skills: [["crowd management", "crowd", 0.95], ["route navigation", "logistics", 0.85], ["vip protocol", "other", 0.8]],
    interests: ["Crowd guide", "Route navigation helper"], locations: ["Trimbakeshwar Temple", "Panchavati"], slots: ["Morning (8-12)", "Evening (16-20)"],
    sessions: 12,
    transcript: "Mi Mohan Patil. 12 varshache seva. Gardi ani margdarshan expert." },
  { id: "d_priyanka", name: "Priyanka Kale", phone: "9822001117", gender: "female", dob: "2001-03-15",
    languages: [["Marathi", "native"], ["Hindi", "fluent"], ["English", "conversational"], ["Telugu", "conversational"]],
    skills: [["language helper", "language", 0.82], ["teaching", "teaching", 0.85], ["lost-child assistance", "crowd", 0.8]],
    interests: ["Language helper", "Lost-child assistance"], locations: ["Panchavati", "Central Bus Stand"], slots: ["Morning (8-12)"],
    sessions: 1,
    transcript: "Mi Priyanka Kale, teacher. Chhoti mulanna bhirjala madat karte." },
  { id: "d_ramesh", name: "Ramesh Deore", phone: "9822001118", gender: "male", dob: "1989-08-20",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["first aid", "medical", 0.85], ["swimming", "safety", 0.8], ["crowd management", "crowd", 0.75]],
    interests: ["First-aid support", "Lifeguard"], locations: ["Someshwar Ghat", "Godavari Ghats"], slots: ["Full day"],
    certs: [["First Aid / Medical Certificate", "medical"], ["Swimming / Lifesaving Certificate", "safety"]], sessions: 5,
    transcript: "Mi Ramesh Deore. Someshwar ghatavar lifeguard ani first aid don hi karte." },
  { id: "d_jyoti", name: "Jyoti Waghmare", phone: "9822001119", gender: "female", dob: "1990-06-06",
    languages: [["Marathi", "native"], ["Hindi", "fluent"]],
    skills: [["sanitation", "logistics", 0.88], ["waste management", "logistics", 0.85], ["elderly support", "other", 0.8]],
    interests: ["Sanitation steward"], locations: ["Kalaram Temple", "Ramkund"], slots: ["Early morning (4-8)", "Morning (8-12)"],
    sessions: 7,
    transcript: "Mi Jyoti. Swachhata seva. Sakalcha shift." },
  { id: "d_arif", name: "Arif Qureshi", phone: "9822001120", gender: "male", dob: "1993-12-24",
    languages: [["Hindi", "native"], ["Marathi", "fluent"], ["English", "conversational"]],
    skills: [["driving", "logistics", 0.9], ["ambulance coordination", "medical", 0.8], ["route navigation", "logistics", 0.88]],
    interests: ["Route navigation helper"], locations: ["Nashik Road", "Nashik Airport Road"], slots: ["Night (20-24)"],
    sessions: 4,
    transcript: "Arif Qureshi, night driver. Airport station route purn jankari." },
  { id: "d_manisha", name: "Manisha Bhosale", phone: "9822001121", gender: "female", dob: "1995-05-05",
    languages: [["Marathi", "native"], ["Hindi", "fluent"], ["Gujarati", "fluent"]],
    skills: [["language helper", "language", 0.88], ["crowd guidance", "crowd", 0.8], ["food distribution", "logistics", 0.75]],
    interests: ["Language helper"], locations: ["Ramkund", "Panchavati"], slots: ["Morning (8-12)", "Afternoon (12-16)"],
    sessions: 3,
    transcript: "Mi Manisha. Gujarati Marathi Hindi — bhaktanna bhasha madat." },
  { id: "d_sagar", name: "Sagar Kadam", phone: "9822001122", gender: "male", dob: "1999-01-30",
    languages: [["Marathi", "native"], ["English", "fluent"], ["Hindi", "conversational"]],
    skills: [["tech support", "technical", 0.85], ["lost-child assistance", "crowd", 0.78], ["data entry", "technical", 0.82]],
    interests: ["Tech support desk", "Lost-child assistance"], locations: ["Central Bus Stand"], slots: ["Afternoon (12-16)", "Evening (16-20)"],
    sessions: 2,
    transcript: "Sagar here. Tech support + lost child desk at CBS." },
  { id: "d_lata", name: "Lata Uhale", phone: "9822001123", gender: "female", dob: "1984-09-17",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["elderly support", "other", 0.92], ["medical escort", "medical", 0.8], ["crowd guidance", "crowd", 0.75]],
    interests: ["Elderly & accessibility support"], locations: ["Trimbakeshwar Temple", "Muktidham"], slots: ["Morning (8-12)", "Evening (16-20)"],
    sessions: 8,
    transcript: "Mi Lata. Vrudha bhaktanna fari madat karte. Trimbakeshwar muktidad." },
  { id: "d_deepak", name: "Deepak Sable", phone: "9822001124", gender: "male", dob: "1992-02-02",
    languages: [["Marathi", "native"], ["Hindi", "conversational"]],
    skills: [["lifeguard", "safety", 0.88, true], ["swimming", "safety", 0.92], ["first aid", "medical", 0.75]],
    interests: ["Lifeguard"], locations: ["Ramkund", "Lakshminarayan Ghat"], slots: ["Evening (16-20)", "Night (20-24)"],
    certs: [["Swimming / Lifesaving Certificate", "safety"]], sessions: 5,
    transcript: "Mi Deepak Sable. Ramkund lifeguard. Sandhyakali duty." },
  { id: "d_zoya", name: "Zoya Khan", phone: "9822001125", gender: "female", dob: "1998-12-12",
    languages: [["Hindi", "native"], ["English", "fluent"], ["Urdu", "fluent"], ["Tamil", "conversational"]],
    skills: [["language helper", "language", 0.9], ["counselling", "other", 0.8], ["lost-child assistance", "crowd", 0.82]],
    interests: ["Language helper", "Lost-child assistance"], locations: ["Nashik Road Railway Station", "Dwarka"], slots: ["Full day"],
    sessions: 3,
    transcript: "I am Zoya. Tamil Hindi Urdu English. Full day at railway station help desk." },
  { id: "d_balu", name: "Balu Thombre", phone: "9822001126", gender: "male", dob: "1977-07-19",
    languages: [["Marathi", "native"], ["Hindi", "basic"]],
    skills: [["sanitation", "logistics", 0.95], ["waste management", "logistics", 0.92], ["crowd management", "crowd", 0.7]],
    interests: ["Sanitation steward"], locations: ["Godavari Ghats", "Kapila Sangam Ghat"], slots: ["Early morning (4-8)"],
    sessions: 11,
    transcript: "Mi Balu Thombre. Ghat swachhata. 11 varsha. Sakalcha shift." },
  { id: "d_shalini", name: "Shalini Rane", phone: "9822001127", gender: "female", dob: "1997-04-09",
    languages: [["Marathi", "native"], ["English", "native"], ["Hindi", "fluent"]],
    skills: [["paramedic", "medical", 0.9, true], ["first aid", "medical", 0.92], ["emergency response", "medical", 0.88]],
    interests: ["First-aid support"], locations: ["Panchavati", "Nashik Road"], slots: ["Morning (8-12)", "Night (20-24)"],
    certs: [["First Aid / Medical Certificate", "medical"]], sessions: 6,
    transcript: "Shalini Rane, paramedic. Panchavati medical camp. Emergency ready." },
  { id: "d_nitin", name: "Nitin Bhalerao", phone: "9822001128", gender: "male", dob: "1987-10-05",
    languages: [["Marathi", "native"], ["Hindi", "fluent"]],
    skills: [["crowd management", "crowd", 0.87], ["queue management", "crowd", 0.9], ["banner holding", "crowd", 0.8]],
    interests: ["Queue management", "Crowd guide"], locations: ["Kalaram Temple", "Panchavati"], slots: ["Morning (8-12)", "Evening (16-20)"],
    sessions: 9,
    transcript: "Mi Nitin Bhalerao. Kalaram mandir queue expert. 9 varsha seva." },
  { id: "d_farida", name: "Farida Sayyed", phone: "9822001129", gender: "female", dob: "1991-08-08",
    languages: [["Hindi", "native"], ["Marathi", "fluent"], ["Malayalam", "conversational"]],
    skills: [["language helper", "language", 0.85], ["medical escort", "medical", 0.75], ["child care", "other", 0.8]],
    interests: ["Language helper", "Elderly & accessibility support"], locations: ["Nashik Road Railway Station", "Muktidham"], slots: ["Afternoon (12-16)"],
    sessions: 2,
    transcript: "Farida here. Malayalam Hindi Marathi. Medical escort for pilgrims." },
  { id: "d_vikas", name: "Vikas Aher", phone: "9822001130", gender: "male", dob: "1996-06-25",
    languages: [["Marathi", "native"], ["Hindi", "conversational"], ["English", "basic"]],
    skills: [["swimming", "safety", 0.85], ["rescue", "safety", 0.8], ["driving", "logistics", 0.75]],
    interests: ["Lifeguard"], locations: ["Kapila Sangam Ghat", "Someshwar Ghat"], slots: ["Morning (8-12)", "Afternoon (12-16)"],
    sessions: 3,
    transcript: "Mi Vikas Aher. Kapila Sangam ghat swim rescue. Sakali ani dupahari." },
  { id: "d_snehal", name: "Snehal Mokashi", phone: "9822001131", gender: "female", dob: "2000-01-01",
    languages: [["Marathi", "native"], ["English", "fluent"], ["Hindi", "fluent"]],
    skills: [["translation", "language", 0.88], ["tech support", "technical", 0.8], ["data entry", "technical", 0.85]],
    interests: ["Language helper", "Tech support desk"], locations: ["Central Bus Stand", "Dwarka"], slots: ["Morning (8-12)"],
    sessions: 1,
    transcript: "Snehal Mokashi. Translation tech support. Control room data entry." },
  { id: "d_usha", name: "Usha Nagare", phone: "9822001132", gender: "female", dob: "1981-03-03",
    languages: [["Marathi", "native"], ["Hindi", "fluent"]],
    skills: [["food distribution", "logistics", 0.9], ["crowd serving", "crowd", 0.85], ["sanitation", "logistics", 0.8]],
    interests: ["Sanitation steward"], locations: ["Trimbakeshwar Temple", "Ramkund"], slots: ["Afternoon (12-16)"],
    sessions: 10,
    transcript: "Mi Usha Nagare. Bhandara seva 10 varsha. Trimbakeshwar." },
];

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function buildVolunteer(spec: SeedSpec): Volunteer {
  const now = new Date().toISOString();
  const languages = spec.languages.map(([language, proficiency]) => ({ language, proficiency, source: "seed" as const }));
  const skills = spec.skills.map(([name, category, confidence, certified]) => ({
    name, category, confidence, certified: !!certified, source: "seed" as const,
  }));
  const certifications = (spec.certs ?? []).map(([title, category], i) => ({
    id: `doc_${spec.id}_${i}`, title, category, filename: `${spec.id}-${i}.pdf`, mimetype: "application/pdf", uploaded_at: now,
  }));

  // Build score history: sessions spread over last 120 days
  const score_events = [];
  for (let i = 0; i < (spec.sessions ?? 0); i++) {
    const ev = makeSessionEvent(spec.skills[0][0], spec.skills[0][1], new Date(Date.now() - (i * 17 + 3) * 86_400_000));
    score_events.push(ev);
  }
  const computed = computeScore(score_events, certifications);

  const extracted_profile: ExtractedProfile = {
    languages_spoken: spec.languages.map(([language, proficiency]) => ({ language, proficiency })),
    skills: spec.skills.map(([skillName, category, confidence]) => ({ name: skillName, category, confidence })),
    interests: spec.interests,
    availability_signals: spec.slots,
    prior_volunteer_experience: (spec.sessions ?? 0) > 3 ? "Multiple Kumbh/Utsav stints" : "New volunteer",
    personality_traits: ["service-minded"],
    recommended_roles: spec.interests,
    red_flags: [],
    summary: `${spec.name}: ${spec.skills.map(([n]) => n).join(", ")}. ${spec.languages.map(([l]) => l).join("/")}. At ${spec.locations.join(", ")}.`,
    extracted_by: "seed",
  };

  return {
    volunteer_id: `v_${spec.id}`,
    created_at: daysAgoIso(30),
    updated_at: now,
    name: spec.name,
    dob: spec.dob,
    gender: spec.gender,
    phone: spec.phone,
    email: "",
    city: "Nashik",
    areas_nashik: spec.locations,
    kyc_verified: true,
    aadhaar_number_masked: `XXXX XXXX ${spec.phone.slice(-4)}`,
    aadhaar_verified: true,
    police_verification_status: "clear",
    languages, skills, interests: spec.interests,
    availability: { dates: [], time_slots: spec.slots, locations: spec.locations },
    certifications,
    transcript_text: spec.transcript,
    story_media_type: "audio",
    extracted_profile,
    score_total: computed.total,
    skill_scores: computed.skillScores,
    score_events,
    documents: [],
    onboarding_status: "complete",
    consent_flags: ["data_processing_consent", "seed"],
  };
}

// ---------- INCIDENTS: real Nashik Kumbh locations from the NTKMA dataset ----------
const INCIDENTS = [
  { title: "Child separated from family at Ramkund snan", description: "5-year-old girl in yellow salwar separated during evening aarti crowd. Last seen near the main ghat steps.", category: "crowd" as const, skills: ["lost-child assistance", "child care"], langs: ["Marathi", "Hindi"], urgency: "critical" as const, people: 3, loc: "Ramkund", lat: 20.0079, lng: 73.7923, radius: 1500 },
  { title: "Swimmer in distress at Kapila Sangam Ghat", description: "Pilgrim swept into deep water during holy dip. Needs trained water rescue immediately.", category: "safety" as const, skills: ["lifeguard", "swimming", "rescue"], langs: ["Marathi"], urgency: "critical" as const, people: 2, loc: "Kapila Sangam Ghat", lat: 19.9984, lng: 73.8144, radius: 2000 },
  { title: "Elderly pilgrim collapsed at Trimbakeshwar queue", description: "72-year-old man fainted in the 400m darshan queue. First-aid + crowd lane management needed.", category: "medical" as const, skills: ["first aid", "paramedic", "crowd management"], langs: ["Marathi", "Hindi"], urgency: "high" as const, people: 2, loc: "Trimbakeshwar Temple", lat: 19.9323, lng: 73.5306, radius: 1500 },
  { title: "Bengali-speaking family lost at Nashik Road station", description: "Family of 6 from Kolkata cannot find their platform. Bengali/Hindi language helper needed at help desk.", category: "language" as const, skills: ["language helper", "translation"], langs: ["Bengali", "Hindi"], urgency: "medium" as const, people: 1, loc: "Nashik Road Railway Station", lat: 19.9486, lng: 73.8411, radius: 2500 },
  { title: "Evening rush surge at Central Bus Stand", description: "Crowd density 3x normal, queue spilling onto road. Queue management + crowd guidance team.", category: "crowd" as const, skills: ["queue management", "crowd management"], langs: ["Marathi", "Hindi"], urgency: "high" as const, people: 4, loc: "Central Bus Stand", lat: 20.0008, lng: 73.7827, radius: 1500 },
  { title: "Ghat cleanliness drive — post-snan shift", description: "Heavy flower/offerings accumulation at Lakshminarayan Ghat after morning snan. Sanitation crew needed.", category: "logistics" as const, skills: ["sanitation", "waste management"], langs: [], urgency: "low" as const, people: 3, loc: "Lakshminarayan Ghat", lat: 20.0012, lng: 73.8102, radius: 3000 },
  { title: "Dehydration cases rising at Panchavati", description: "Heat index up; 6 pilgrims treated for dehydration since noon. Medical support for mobile water point.", category: "medical" as const, skills: ["first aid", "paramedic"], langs: ["Marathi", "Hindi"], urgency: "high" as const, people: 2, loc: "Panchavati", lat: 20.0108, lng: 73.7957, radius: 2000 },
  { title: "Tamil-speaking elderly couple stuck at Dwarka", description: "Couple from Madurai missed their bus. Tamil/Hindi translator + route guidance needed.", category: "language" as const, skills: ["language helper", "route navigation"], langs: ["Tamil", "Hindi"], urgency: "medium" as const, people: 1, loc: "Dwarka", lat: 19.9945, lng: 73.7976, radius: 2000 },
  { title: "Parking overflow chaos at Muktidham", description: "900 vehicles for 400 slots. Drivers confused, mini-jams. Route navigation + crowd management.", category: "logistics" as const, skills: ["route navigation", "driving", "crowd management"], langs: ["Hindi", "Marathi"], urgency: "medium" as const, people: 2, loc: "Muktidham", lat: 19.9516, lng: 73.8367, radius: 2500 },
  { title: "Lost group of 14 from Surat at Kalaram Temple", description: "Pilgrims' group scattered in market crowd. Gujarati speakers to coordinate regrouping.", category: "crowd" as const, skills: ["crowd management", "language helper"], langs: ["Gujarati", "Hindi"], urgency: "high" as const, people: 2, loc: "Kalaram Temple", lat: 20.0070, lng: 73.7952, radius: 2000 },
  { title: "Night shift help desk understaffed at CBS", description: "Tech desk needs 2 for digital lost-and-found entry. Data entry + tech support.", category: "technical" as const, skills: ["tech support", "data entry"], langs: ["Hindi"], urgency: "low" as const, people: 2, loc: "Central Bus Stand", lat: 20.0008, lng: 73.7827, radius: 2000 },
  { title: "Boat patrol support — Someshwar Ghat evening", description: "Deep-water zone needs swimmers for evening patrol when dip crowd peaks.", category: "safety" as const, skills: ["swimming", "rescue", "boat handling"], langs: ["Marathi"], urgency: "medium" as const, people: 2, loc: "Someshwar Ghat", lat: 20.0301, lng: 73.7203, radius: 3000 },
];

async function main() {
  // Volunteers
  let added = 0;
  for (const spec of SEEDS) {
    const id = `v_${spec.id}`;
    if (repo.get(id)) continue;
    const v = buildVolunteer(spec);
    const vector = hashEmbed(profileEmbeddingText(v));
    await repo.insert(v, vector);
    added++;
  }
  console.log(`dispatch seed: ${added} volunteers added (${SEEDS.length} total in set)`);

  // Incidents as needs (via dispatch store through API-independent path)
  const { dispatchStore } = await import("../src/lib/dispatch-store");
  const { NASHIK_GAZETTEER } = await import("../src/lib/gazetteer");
  void NASHIK_GAZETTEER;
  let nAdded = 0;
  for (const [i, inc] of INCIDENTS.entries()) {
    const id = `n_${inc.loc.toLowerCase().replace(/[^a-z]+/g, "_")}_${i}`;
    if (dispatchStore.getNeed(id)) continue;
    await dispatchStore.insertNeed({
      need_id: id,
      title: inc.title,
      description: inc.description,
      category: inc.category,
      required_skills: inc.skills,
      languages_required: inc.langs,
      min_score: 0,
      people_needed: inc.people,
      urgency: inc.urgency,
      location_name: inc.loc,
      lat: inc.lat,
      lng: inc.lng,
      radius_m: inc.radius,
      time_window: { start: "06:00", end: "22:00" },
      status: "open",
      created_at: new Date(Date.now() - i * 3600_000).toISOString(),
      updated_at: new Date().toISOString(),
      source: "demo-incident-seed",
    });
    nAdded++;
  }
  console.log(`dispatch seed: ${nAdded} needs added (${INCIDENTS.length} total)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
