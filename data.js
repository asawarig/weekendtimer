// Choices offered on the site. Answers must come from these lists,
// so nothing free-typed ever shows up publicly.

window.POPULAR_CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Gurugram',
];

window.CITIES = [
  'Agra', 'Ahmedabad', 'Amritsar', 'Aurangabad', 'Bengaluru', 'Bhopal', 'Bhubaneswar',
  'Chandigarh', 'Chennai', 'Coimbatore', 'Dehradun', 'Delhi', 'Dhanbad', 'Faridabad',
  'Ghaziabad', 'Goa', 'Gurugram', 'Guwahati', 'Gwalior', 'Howrah', 'Hyderabad', 'Indore',
  'Jabalpur', 'Jaipur', 'Jodhpur', 'Kanpur', 'Kochi', 'Kolkata', 'Kota', 'Kozhikode',
  'Lucknow', 'Ludhiana', 'Madurai', 'Mangaluru', 'Meerut', 'Mumbai', 'Mysuru', 'Nagpur',
  'Nashik', 'Navi Mumbai', 'Noida', 'Patna', 'Prayagraj', 'Puducherry', 'Pune', 'Raipur',
  'Rajkot', 'Ranchi', 'Shimla', 'Srinagar', 'Surat', 'Thane', 'Thiruvananthapuram',
  'Tiruchirappalli', 'Udaipur', 'Vadodara', 'Varanasi', 'Vijayawada', 'Visakhapatnam',
  'Other city in India',
];

// Areas of work for "What do you do?". Each has an example line shown on its tile, and keywords
// so a search for a job title ("nurse", "CA") finds the right area.
window.JOB_AREAS = [
  { name: 'Tech', examples: 'developer, tester, IT support, data', keywords: 'software engineer developer programmer coder qa tester devops it support data analyst data scientist cloud cyber' },
  { name: 'Design & Product', examples: 'designer, product manager', keywords: 'ux ui graphic designer product manager pm' },
  { name: 'Finance', examples: 'accounts, CA, banking, insurance', keywords: 'accountant chartered accountant ca bank banker finance investment insurance audit tax' },
  { name: 'Sales', examples: 'sales, business development, real estate', keywords: 'sales business development bd account manager real estate agent broker' },
  { name: 'Marketing & Media', examples: 'marketing, content, journalism, video', keywords: 'marketing brand content writer copywriter journalist reporter social media video creator youtuber pr advertising' },
  { name: 'Customer Support', examples: 'call centre, BPO, helpdesk', keywords: 'customer support service call centre call center bpo helpdesk' },
  { name: 'HR & Admin', examples: 'HR, recruitment, office admin', keywords: 'hr human resources recruiter recruitment talent admin office assistant receptionist' },
  { name: 'Operations & Logistics', examples: 'operations, supply chain, warehouse', keywords: 'operations ops supply chain logistics procurement warehouse inventory' },
  { name: 'Consulting & Law', examples: 'consultant, lawyer, analyst', keywords: 'consultant consulting strategy business analyst lawyer advocate legal compliance' },
  { name: 'Engineering & Construction', examples: 'civil, mechanical, architect, site work', keywords: 'civil mechanical electrical engineer architect construction site contractor' },
  { name: 'Factory & Manufacturing', examples: 'plant, production, assembly', keywords: 'factory plant production assembly manufacturing machine operator worker' },
  { name: 'Healthcare', examples: 'doctor, nurse, pharmacist, lab', keywords: 'doctor nurse dentist pharmacist lab technician hospital clinic vet veterinarian physiotherapist' },
  { name: 'Teaching', examples: 'teacher, professor, tutor, trainer', keywords: 'teacher professor lecturer tutor trainer school college education coach' },
  { name: 'Government', examples: 'government office, PSU', keywords: 'government govt psu public sector civil services clerk officer' },
  { name: 'Shops & Restaurants', examples: 'retail, shop owner, chef, hotel', keywords: 'retail shop store owner cashier chef cook restaurant cafe hotel hospitality waiter' },
  { name: 'On the road', examples: 'driver, delivery, pilot, cabin crew', keywords: 'driver delivery partner rider courier pilot cabin crew air hostess transport' },
  { name: 'Hands-on work', examples: 'electrician, plumber, salon, fitness, tailor', keywords: 'electrician plumber mechanic carpenter tailor salon beautician barber fitness trainer gym technician' },
  { name: 'Creative & Arts', examples: 'artist, musician, photographer', keywords: 'artist musician actor photographer painter dancer writer' },
  { name: 'Something else', examples: '', keywords: 'other' },
];
window.OCCUPATIONS = window.JOB_AREAS.map(a => a.name);

// Reference log-off times by city, from PLFS 2025 average weekly hours (OpenCity), blended for an
// urban workforce of about 75% men / 25% women (PLFS 2024), assuming a 9 AM start and a 5-day week.
// Satellite cities use their metro's figure; every other city uses the 8-city average.
window.PLFS_SOURCE = { name: 'PLFS 2025 via OpenCity', url: 'https://opencity.in/plfs-2025-the-missing-half-of-the-workforce-in-indian-cities/' };
window.CITY_LOGOFF = {
  Delhi: 19 * 60 + 41, Mumbai: 19 * 60 + 37, Ahmedabad: 19 * 60 + 20, Pune: 18 * 60 + 42,
  Bengaluru: 18 * 60 + 40, Hyderabad: 18 * 60 + 36, Kolkata: 18 * 60 + 32, Chennai: 18 * 60 + 19,
};
window.CITY_LOGOFF_ALIAS = {
  Thane: 'Mumbai', 'Navi Mumbai': 'Mumbai', Gurugram: 'Delhi', Noida: 'Delhi', Ghaziabad: 'Delhi',
  Faridabad: 'Delhi', Howrah: 'Kolkata',
};
window.INDIA_LOGOFF = 18 * 60 + 56;
