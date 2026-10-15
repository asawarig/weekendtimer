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

window.OCCUPATIONS = [
  'Accountant', 'Actor', 'Architect', 'Armed Forces', 'Artist', 'Banker', 'Beautician / Salon',
  'Business Analyst', 'Call Centre / BPO', 'Chartered Accountant', 'Chef / Cook', 'Civil Engineer',
  'Consultant', 'Construction Worker', 'Content Writer', 'Customer Support', 'Data Analyst',
  'Data Scientist', 'Delivery Partner', 'Dentist', 'Designer', 'DevOps Engineer', 'Doctor',
  'Driver', 'Electrician', 'Entrepreneur / Founder', 'Factory Worker', 'Farmer', 'Finance',
  'Fitness Trainer', 'Freelancer', 'Government Employee', 'Homemaker', 'HR', 'Insurance Advisor',
  'IT Support', 'Journalist', 'Lawyer', 'Marketing', 'Mechanical Engineer', 'Musician', 'Nurse',
  'Operations', 'Pharmacist', 'Photographer', 'Pilot / Cabin Crew', 'Plumber', 'Police',
  'Product Manager', 'Professor', 'QA / Tester', 'Real Estate Agent', 'Researcher',
  'Restaurant Staff', 'Retail Staff', 'Sales', 'Scientist', 'Shop Owner', 'Social Worker',
  'Software Engineer', 'Student', 'Supply Chain / Logistics', 'Teacher', 'Video Creator',
  'Veterinarian', 'Other',
];

// Research-based reference log-off times, used for a city until it has enough real answers.
// Traffic/metro peaks are when most people are heading home, so they are estimates, not surveys.
(() => {
  const MIS = { source: 'MoveInSync Travel Time Report 2019', url: 'https://www.peoplematters.in/news/organisational-culture/indians-spend-7-of-their-day-in-office-commute-report-22905' };
  const tt = c => ({ source: 'TomTom Traffic Index 2025', url: `https://www.tomtom.com/traffic-index/${c}-traffic/` });
  window.CITY_REFERENCE = {
    Bengaluru: { minutes: 18 * 60 + 40, source: 'Namma Metro hourly ridership, weekdays Aug–Sep 2025', url: 'https://github.com/Vonter/bmrcl-ridership-hourly' },
    Mumbai: { minutes: 19 * 60, ...MIS },
    Pune: { minutes: 19 * 60, ...MIS },
    Ahmedabad: { minutes: 19 * 60, ...tt('ahmedabad') },
    Delhi: { minutes: 18 * 60, ...MIS },
    Gurugram: { minutes: 18 * 60, ...MIS },
    Noida: { minutes: 18 * 60, ...MIS },
    Chennai: { minutes: 18 * 60, ...MIS },
    Hyderabad: { minutes: 18 * 60, ...MIS },
    Kolkata: { minutes: 18 * 60, ...tt('kolkata') },
    Jaipur: { minutes: 18 * 60, ...tt('jaipur') },
  };
})();
