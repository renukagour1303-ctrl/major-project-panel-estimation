You are an AI software development agent helping me build a real client-facing sponsored project. 



IMPORTANT: Read this entire specification before writing code. 



============================================================

1\. PROJECT CONTEXT

============================================================ 



I am a final-year B.Tech Computer Science Engineering student. 



I am developing a sponsored software project for a real client: 



Sungroves Innovations LLP

Solar installation company

Chhatrapati Sambhajinagar, Maharashtra, India 



Project name: 



AI-Powered Solar Calculator Web Tool 



This is NOT merely a classroom mockup or throwaway prototype. 



It is being developed for an actual company as a client-facing pre-sales estimation tool. The final system should therefore be treated as a real MVP/application and should have: 



\- Reliable calculations

\- Real API integrations

\- Proper validation

\- Proper error handling

\- Secure handling of API credentials

\- Maintainable code

\- Responsive professional UI

\- Clear units

\- Testable calculation logic

\- No fake/mock core functionality

\- No hardcoded results where real calculations/API data are required 



However, do NOT add unnecessary enterprise features that are outside this specification. 



The main goal is a working solar pre-sales estimation workflow. 



============================================================

2\. BUSINESS PROBLEM

============================================================ 



Sungroves Innovations currently requires a physical site visit to provide customers with a basic preliminary solar system estimate. 



The application should automate this first stage digitally. 



The customer should be able to: 



1\. Detect or enter their location.

2\. View a satellite image centered on their location.

3\. Manually trace their roof on the satellite map.

4\. Enter their electricity bill information.

5\. Select a solar-panel wattage.

6\. Click Calculate.

7\. Receive a complete preliminary solar estimate. 



The application should help Sungroves use this as a smart pre-sales tool before a physical site visit. 



The result is an ESTIMATE and must not be presented as a final engineering design, structural approval, utility approval, installation quotation, or guaranteed financial outcome. 



============================================================

3\. IMPORTANT ARCHITECTURE PRINCIPLE

============================================================ 



The application has TWO separate responsibilities: 



A. DETERMINISTIC CALCULATION ENGINE

B. AI EXPLANATION/RECOMMENDATION 



The actual solar calculations MUST be performed by normal programmed logic using explicit formulas. 



Claude MUST NOT calculate or invent the numerical results. 



Correct architecture: 



User inputs

    ↓

Location + roof geometry

    ↓

Solar data from PVGIS/NASA

    ↓

Deterministic calculation engine

    ↓

Calculated numerical results

    ↓

Claude receives those results

    ↓

Claude explains/recommends in natural language 



Claude is an explanation layer, NOT the source of truth for numerical calculations. 



If Claude is unavailable, the complete numerical solar calculation must still work. 



============================================================

4\. TECHNOLOGY STACK

============================================================ 



Frontend:

\- React.js

\- JavaScript

\- Axios

\- Leaflet.js

\- Leaflet.draw

\- Turf.js

\- Recharts 



Backend:

\- Node.js

\- Express.js 



Database:

\- SQLite 



External APIs: 



1\. PVGIS API

   - Primary solar-resource API

   - Backend only 



2\. NASA POWER API

   - Fallback solar-resource API

   - Backend only 



3\. Claude API

   - AI recommendation/explanation

   - Backend only 



4\. Nominatim API

   - Manual city/pincode geocoding 



Location:

\- Browser navigator.geolocation

\- Manual fallback 



Map:

\- Leaflet.js

\- Leaflet.draw

\- Esri World Imagery satellite tiles 



Version control:

\- Git

\- GitHub 



============================================================

5\. USER INPUTS

============================================================ 



The user should NOT perform mathematical calculations. 



The user only provides information they reasonably know. 



Required user information: 



1\. Location

   - GPS automatically OR

   - City name OR

   - Pincode OR

   - Coordinates 



2\. Roof

   - User manually traces the roof polygon on satellite imagery 



3\. Monthly electricity bill

   - Amount in Indian Rupees 



4\. Per-unit electricity rate

   - ₹/kWh

   - User reads this from their electricity bill

   - Do NOT hardcode a single Maharashtra/MSEDCL tariff because electricity pricing can vary by slab/category. 



5\. Panel wattage preference

   - 350 W

   - 400 W

   - 550 W 



The user should NEVER be asked to calculate:

\- roof area

\- electricity consumption

\- usable roof area

\- system size

\- panel count

\- generation

\- savings

\- subsidy

\- payback

\- CO2 reduction 



The software calculates all of these. 



============================================================

6\. COMPLETE USER FLOW

============================================================ 



STEP 1:

Detect or enter location. 



STEP 2:

Load satellite map centered on confirmed location. 



STEP 3:

User manually traces their roof polygon. 



STEP 4:

User enters:

\- Monthly electricity bill

\- Per-unit electricity rate 



STEP 5:

User selects panel wattage. 



STEP 6:

User clicks Calculate. 



STEP 7:

Backend performs solar-data retrieval and deterministic calculations. 



STEP 8:

Results page displays:

\- Technical results

\- Financial results

\- Environmental impact

\- AI recommendation 



IMPORTANT: 



The user MUST NOT be allowed to calculate results without completing the roof trace. 



Display: 



"Draw your roof outline on the map above" 



If they attempt to calculate without a roof polygon: 



"Please trace your roof first." 



============================================================

7\. LOCATION DETECTION

============================================================ 



Primary method: 



Use: 



navigator.geolocation 



If permission is granted:

\- Obtain latitude and longitude.

\- Center the satellite map on that location. 



Fallback: 



If GPS is denied/unavailable:

\- Show manual location input. 



Manual input may be:

\- City

\- Pincode

\- Coordinates 



For city/pincode:

\- Use Nominatim to convert the location into latitude/longitude.

\- Then load the satellite map. 



If Nominatim fails:

\- Show a clear retry/error message. 



Do not block the application permanently if GPS permission is denied. 



============================================================

8\. SATELLITE MAP

============================================================ 



Use: 



\- Leaflet.js

\- Leaflet.draw

\- Esri World Imagery satellite tiles 



Esri tile URL: 



https://server.arcgisonline.com/ArcGIS/rest/services/World\_Imagery/MapServer/tile/{z}/{y}/{x} 



The map must:

\- Center automatically on confirmed location.

\- Show satellite imagery.

\- Be mobile responsive.

\- Include required attribution. 



============================================================

9\. MANDATORY ROOF TRACING

============================================================ 



This is a CORE FEATURE. 



The user manually draws the outline of their roof on the satellite map. 



Use: 



Leaflet.draw 



The user must be able to:

\- Draw polygon

\- Edit polygon

\- Delete polygon

\- Redraw polygon

\- Confirm roof 



Use Turf.js to calculate polygon area. 



The area must be calculated in square meters. 



Workflow: 



Satellite map

    ↓

User draws polygon

    ↓

Leaflet.draw returns geometry

    ↓

Turf.js calculates area

    ↓

Traced Roof Area (m²) 



Do NOT use AI/computer vision to automatically detect the roof. 



Manual tracing is mandatory. 



============================================================

10\. USABLE ROOF AREA

============================================================ 



After calculating traced roof area: 



Usable Roof Area = Traced Roof Area × 0.75 



The 75% factor is intended to account for:

\- roof edges

\- spacing

\- shading

\- vents

\- gaps

\- obstructions 



The user does not calculate this. 



The software does. 



============================================================

11\. SOLAR DATA

============================================================ 



The backend receives: 



\- latitude

\- longitude 



Primary source: 



PVGIS API 



If PVGIS fails: 



Automatically fall back to NASA POWER API. 



The frontend should not directly call PVGIS or NASA POWER. 



The frontend should communicate with our backend. 



Architecture: 



Frontend

    ↓

Backend

    ↓

PVGIS

    ↓ failure

NASA POWER 



The backend should record which solar-data source was successfully used: 



\- PVGIS

\- NASA 



Do not expose API implementation details unnecessarily to the frontend. 



============================================================

12\. PVGIS / NASA DATA PROCESSING

============================================================ 



PVGIS is the primary source of solar-resource information. 



The project specification expects monthly solar-resource data. 



The backend should retrieve the required monthly values and process them consistently. 



IMPORTANT: 



Before implementing the exact calculation, inspect the actual PVGIS response and units. 



Do NOT assume an API response field or unit without verifying it. 



Do NOT blindly treat arbitrary irradiance values as Peak Sun Hours. 



The final implementation must maintain unit consistency. 



If PVGIS data cannot be retrieved:

\- Attempt NASA POWER fallback. 



NASA POWER endpoint: 



https://power.larc.nasa.gov/api/temporal/monthly/point 



Parameters: 



latitude

longitude

parameters=ALLSKY\_SFC\_SW\_DWN

community=RE

format=JSON 



The actual NASA response structure must be handled correctly. 



============================================================

13\. ELECTRICITY CONSUMPTION

============================================================ 



User enters: 



Monthly electricity bill (₹) 



and 



Per-unit rate (₹/kWh) 



The application estimates monthly electricity consumption: 



Monthly Consumption (kWh)

=

Monthly Bill ÷ Per Unit Rate 



Daily Load (kWh/day)

=

Monthly Consumption ÷ 30 



Equivalent: 



Daily Load

=

Monthly Bill ÷ Per Unit Rate ÷ 30 



This is deterministic JavaScript logic. 



Validate that:

\- bill > 0

\- rate > 0

\- both are numeric 



Never allow division by zero. 



============================================================

14\. PANEL OPTIONS

============================================================ 



Provide a dropdown: 



350 W

400 W

550 W 



Panel assumptions: 



350 W:

\- Panel area = 1.7 m² 



400 W:

\- Panel area = 2.0 m² 



550 W:

\- Panel area = 2.4 m² 



Store these values in a central configuration object. 



Do not hardcode the values throughout multiple components. 



Example: 



const panelOptions = {

  350: {

    wattage: 350,

    area: 1.7

  },

  400: {

    wattage: 400,

    area: 2.0

  },

  550: {

    wattage: 550,

    area: 2.4

  }

}; 



============================================================

15\. BILL-BASED SYSTEM SIZE

============================================================ 



Use the specified project assumptions. 



Daily Load: 



Daily Load

=

Monthly Bill ÷ Per Unit Rate ÷ 30 



Performance Ratio: 



PR = 0.75 



Bill-based system size: 



System Size from Bill (kWp)

=

Daily Load ÷ (Peak Sun Hours × 0.75) 



Keep this logic inside a dedicated calculation service. 



============================================================

16\. ROOF-BASED SYSTEM SIZE

============================================================ 



Because roof tracing is mandatory: 



Maximum Panels Possible

=

floor(Usable Roof Area ÷ Selected Panel Area) 



Do not allow fractional panels. 



Then: 



Maximum System Size from Roof (kWp)

=

Maximum Panels Possible × Panel Wattage ÷ 1000 



============================================================

17\. FINAL SYSTEM SIZE

============================================================ 



Calculate both: 



1\. Bill-based system size

2\. Roof-based maximum system size 



Then: 



Final System Size

=

MIN(Bill-based System Size, Roof-based System Size) 



The system MUST NOT recommend a system that physically exceeds the roof capacity. 



Determine limiting factor: 



If roof-based system size < bill-based system size: 



limitingFactor = "roof" 



Otherwise: 



limitingFactor = "bill" 



============================================================

18\. ROOF LIMIT WARNING

============================================================ 



If the roof is the limiting factor, show: 



"Your available roof space supports approximately X kWp, which may cover approximately Y% of your estimated monthly electricity consumption." 



Calculate X and Y using the deterministic calculation engine. 



Do NOT ask Claude to calculate Y. 



Claude may explain the already-calculated result. 



============================================================

19\. NUMBER OF PANELS

============================================================ 



Calculate: 



Number of Panels

=

(Final System Size × 1000) ÷ Selected Panel Wattage 



The final implementation must ensure the number of panels is a valid integer and does not exceed the physically possible panel count. 



Total Panel Area: 



Total Panel Area

=

Number of Panels × Selected Panel Area 



============================================================

20\. MONTHLY GENERATION

============================================================ 



Use the specified project formula: 



Monthly Generation (kWh)

=

Final System Size × Peak Sun Hours × 30 × 0.75 



Maintain correct units throughout the calculation. 



============================================================

21\. MONTHLY CONSUMPTION

============================================================ 



Monthly Consumption (kWh)

=

Daily Load × 30 



This should correspond approximately to the consumption calculated from the user's bill and per-unit rate. 



============================================================

22\. MONTHLY SAVINGS

============================================================ 



Use the project assumption: 



Monthly Savings (₹)

=

Monthly Generation × Per Unit Rate 



Label this as: 



"Estimated Monthly Savings" 



Do not present it as a guaranteed reduction in the customer's actual electricity bill. 



============================================================

23\. NET METERING / EXCESS GENERATION

============================================================ 



Calculate: 



Excess Generation

=

Monthly Generation - Monthly Consumption 



If positive:

\- Display estimated excess generation. 



If negative:

\- Display estimated shortfall. 



Use wording such as: 



"Estimated excess generation that may be exported under applicable net-metering rules." 



Do NOT promise a particular export payment, credit, or utility treatment. 



Actual net-metering treatment depends on applicable regulations and utility policies. 



============================================================

24\. COST ESTIMATE

============================================================ 



Use the project assumption: 



Gross Cost

=

Final System Size × ₹55,000/kWp 



Clearly label: 



"Estimated Cost" 



This is an estimation assumption and must not be presented as a binding quotation from Sungroves. 



============================================================

25\. PM SURYA GHAR SUBSIDY

============================================================ 



For eligible residential users, use the specified project assumptions: 



First 2 kW:

₹30,000/kW 



2 kW to 3 kW:

₹18,000/kW additional 



Above 3 kW:

No additional subsidy 



Maximum possible subsidy:

₹78,000 



Calculate applicable subsidy deterministically. 



IMPORTANT: 



Do not automatically apply this subsidy to commercial customers. 



The application should clearly distinguish residential eligibility from commercial users. 



If necessary for the first implementation, focus the subsidy calculation on eligible residential customers in Maharashtra. 



Do not claim eligibility without appropriate verification. 



============================================================

26\. NET COST

============================================================ 



Net Cost

=

Gross Cost - Applicable Subsidy 



Display: 



Estimated Net Cost After Applicable Subsidy 



============================================================

27\. PAYBACK PERIOD

============================================================ 



Annual Savings: 



Annual Savings

=

Monthly Savings × 12 



Payback: 



Payback Period (years)

=

Net Cost ÷ Annual Savings 



If Annual Savings <= 0: 



Do not divide by zero. 



Display: 



"Payback period cannot be estimated from the available information." 



============================================================

28\. ENVIRONMENTAL IMPACT

============================================================ 



Prototype calculation assumption: 



Grid Emission Factor

=

0.82 kg CO₂/kWh 



Annual CO₂ Saved: 



Annual CO₂ Saved

=

Monthly Generation × 12 × 0.82 



Tree equivalent: 



Equivalent Trees

=

Annual CO₂ Saved ÷ 21 



Display: 



"Your estimated solar system could avoid approximately X kg of CO₂ emissions per year." 



and: 



"Equivalent to approximately X trees." 



Clearly label the tree number as an environmental equivalent, not literal tree planting. 



============================================================

29\. CLAUDE AI RECOMMENDATION

============================================================ 



Claude is ONLY responsible for generating a friendly explanation/recommendation from already-calculated values. 



The backend should send Claude: 



\- City

\- Peak sun hours / solar resource value

\- Final system size

\- Number of panels

\- Selected panel wattage

\- Total panel area

\- Traced roof area

\- Usable roof area

\- Monthly generation

\- Monthly consumption

\- Excess generation or shortfall

\- Monthly savings

\- Gross cost

\- Subsidy

\- Net cost

\- Payback period

\- Annual CO₂ saved

\- Equivalent trees

\- Limiting factor 



Claude should return one concise, friendly paragraph. 



Claude must: 



\- NEVER invent numerical values.

\- NEVER change numerical values.

\- NEVER calculate an alternative system size.

\- NEVER override the deterministic calculation engine.

\- NEVER claim guaranteed savings.

\- NEVER guarantee subsidy eligibility.

\- NEVER guarantee net-metering benefits.

\- NEVER present the estimate as final engineering approval.

\- NEVER make up information not supplied to it. 



If Claude fails, the application must still show all numerical results. 



============================================================

30\. RESULTS PAGE

============================================================ 



Results should be displayed in clear sections. 



TECHNICAL RESULTS: 



\- System Size (kWp)

\- Number of Panels

\- Panel Wattage

\- Total Panel Area (m²)

\- Traced Roof Area (m²)

\- Usable Roof Area (m²)

\- Monthly Generation (kWh)

\- Monthly Consumption (kWh)

\- Excess Generation / Shortfall (kWh) 



FINANCIAL RESULTS: 



\- Estimated Gross Cost (₹)

\- Applicable Subsidy (₹)

\- Estimated Net Cost (₹)

\- Estimated Monthly Savings (₹)

\- Estimated Payback Period (years) 



ENVIRONMENTAL IMPACT: 



\- Annual CO₂ Saved (kg)

\- Equivalent Trees 



AI SUMMARY: 



\- Claude-generated paragraph 



Also show the traced roof polygon on the results page in read-only/non-editable form. 



============================================================

31\. SQLITE DATABASE

============================================================ 



Use SQLite. 



One table: 



customer\_calculations 



Fields: 



\- id

\- timestamp

\- city\_name

\- latitude

\- longitude

\- monthly\_bill

\- per\_unit\_rate

\- panel\_wattage\_selected

\- peak\_sun\_hours

\- solar\_api\_used

\- traced\_roof\_area

\- usable\_roof\_area

\- system\_size

\- limiting\_factor

\- num\_panels

\- monthly\_generation

\- monthly\_savings

\- net\_cost

\- payback\_years

\- co2\_saved\_annual 



Do not collect unnecessary sensitive personal information. 



Use parameterized database queries. 



============================================================

32\. ERROR HANDLING

============================================================ 



GPS denied: 



→ Automatically provide manual location entry. 



Nominatim fails: 



→ Display a clear error and allow retry. 



PVGIS fails: 



→ Automatically attempt NASA POWER. 



Both PVGIS and NASA POWER fail: 



→ Show: 



"Solar data could not be retrieved right now. Please try again later." 



Claude fails: 



→ Display all deterministic numerical results.

→ Omit AI summary.

→ Do NOT fail the entire calculation. 



Roof not traced: 



→ Prevent calculation.

→ Display: 



"Please trace your roof first." 



Invalid bill/rate: 



→ Validate.

→ Show clear error. 



API calls: 



→ Show loading states/spinners. 



Network errors: 



→ Show useful user-facing messages. 



Do not silently return fake/default solar values when APIs fail. 



============================================================

33\. SECURITY REQUIREMENTS

============================================================ 



All API secrets must remain on the backend. 



Never expose Claude API credentials in React. 



Never hardcode secrets into source code. 



Use environment variables. 



Example: 



.env 



Never commit .env to GitHub. 



Create .env.example containing placeholder variable names only. 



Use appropriate CORS configuration. 



Validate and sanitize backend inputs. 



Do not store unnecessary personal/sensitive information. 



============================================================

34\. FRONTEND RESPONSIBILITIES

============================================================ 



Frontend handles: 



\- User interface

\- Location permission

\- Manual location form

\- Map

\- Satellite imagery

\- Roof drawing

\- Roof editing/redrawing

\- Turf.js area calculation

\- User inputs

\- Client-side validation

\- Loading states

\- Results

\- Charts

\- Error messages 



Frontend communicates with our backend. 



Frontend must NOT directly call:

\- PVGIS

\- NASA POWER

\- Claude 



============================================================

35\. BACKEND RESPONSIBILITIES

============================================================ 



Backend handles: 



\- Input validation

\- Nominatim requests where appropriate

\- PVGIS

\- NASA POWER fallback

\- Solar-data processing

\- Deterministic calculation engine

\- Claude

\- SQLite

\- API routes

\- Error handling 



Keep the calculation engine in separate reusable functions/services. 



For example: 



backend/src/calculations/solarCalculator.js 



============================================================

36\. RECOMMENDED BACKEND CALCULATION STRUCTURE

============================================================ 



Create small testable functions such as: 



calculateMonthlyConsumption() 



calculateDailyLoad() 



calculateUsableRoofArea() 



calculateBillBasedSystemSize() 



calculateMaximumPanels() 



calculateRoofBasedSystemSize() 



calculateFinalSystemSize() 



calculatePanelCount() 



calculateMonthlyGeneration() 



calculateMonthlySavings() 



calculateExcessGeneration() 



calculateSubsidy() 



calculateNetCost() 



calculatePayback() 



calculateAnnualCO2() 



calculateTreeEquivalent() 



calculateLimitingFactor() 



Do not put the entire calculation system into one giant function. 



============================================================

37\. PROJECT STRUCTURE

============================================================ 



Recommended structure: 



solar-calculator/ 



├── frontend/

│   ├── src/

│   │   ├── components/

│   │   ├── pages/

│   │   ├── services/

│   │   ├── utils/

│   │   └── App.jsx

│   └── package.json

│

├── backend/

│   ├── src/

│   │   ├── routes/

│   │   ├── controllers/

│   │   ├── services/

│   │   ├── calculations/

│   │   ├── database/

│   │   └── utils/

│   └── package.json

│

├── .gitignore

├── .env.example

└── README.md 



Keep frontend and backend clearly separated. 



============================================================

38\. UI/UX REQUIREMENTS

============================================================ 



Visual theme: 



\- Greens

\- Whites

\- Warm yellows 



The application should look professional and appropriate for a solar installation company. 



The UI should be: 



\- Clean

\- Modern

\- Trustworthy

\- Simple

\- Mobile responsive 



Use a step-by-step workflow. 



Suggested flow: 



Location

    ↓

Trace Roof

    ↓

Electricity Details

    ↓

Panel Selection

    ↓

Calculate

    ↓

Results 



Do NOT put every field into one overwhelming form. 



The map must visibly explain that the user needs to trace their roof. 



Provide:

\- Draw

\- Edit

\- Delete

\- Redraw

\- Confirm 



Results should use clean summary cards. 



Environmental impact should be visually positive. 



============================================================

39\. DEVELOPMENT STRATEGY

============================================================ 



IMPORTANT: 



Do NOT attempt to generate the entire application in one huge AI generation. 



Build it in chunks. 



Each chunk must be implemented, run, tested, and committed before moving to the next major chunk. 



Recommended order: 



CHUNK 1:

Project setup

\- React

\- Node

\- Express

\- Git

\- GitHub

\- Environment configuration 



CHUNK 2:

Frontend shell

\- Navigation

\- Step-by-step UI

\- Basic responsive layout 



CHUNK 3:

Location

\- GPS

\- Manual location

\- Nominatim 



CHUNK 4:

Satellite map

\- Leaflet

\- Esri imagery

\- Attribution 



CHUNK 5:

Roof drawing

\- Leaflet.draw

\- Polygon

\- Edit

\- Delete

\- Redraw 



CHUNK 6:

Roof area

\- Turf.js

\- Traced area

\- 75% usable area 



CHUNK 7:

Electricity inputs

\- Bill

\- Unit rate

\- Panel selection

\- Validation 



CHUNK 8:

Calculation engine

\- Build deterministic calculation functions

\- Unit tests

\- No AI calculations 



CHUNK 9:

PVGIS integration

\- Backend only

\- Real API response handling 



CHUNK 10:

NASA POWER fallback 



CHUNK 11:

Backend/frontend integration 



CHUNK 12:

Results dashboard 



CHUNK 13:

SQLite calculation history 



CHUNK 14:

Claude recommendation 



CHUNK 15:

Full integration 



CHUNK 16:

Testing

\- Normal cases

\- Invalid inputs

\- GPS denial

\- API failures

\- PVGIS fallback

\- Claude failure

\- Roof-limited case

\- Bill-limited case

\- Mobile testing 



CHUNK 17:

Final UI polish

\- Loading states

\- Error states

\- Accessibility

\- Responsive layout

\- Client-facing presentation quality 



============================================================

40\. AI CODING WORKFLOW

============================================================ 



AI coding tools such as Antigravity may generate most of the implementation. 



However: 



Do NOT blindly generate a giant application and assume it works. 



For each chunk: 



1\. Read the relevant specification.

2\. Implement only that chunk.

3\. Run the application.

4\. Test manually.

5\. Check browser console.

6\. Check backend terminal.

7\. Fix errors.

8\. Verify the expected behavior.

9\. Commit to GitHub.

10\. Continue to the next chunk. 



When modifying existing code: 



\- Understand the current structure.

\- Avoid unnecessary rewrites.

\- Modify only relevant files.

\- Do not break already-working features. 



Do not introduce new frameworks or technologies unless explicitly requested. 



Do not replace React/Express/Leaflet/etc. with another stack. 



============================================================

41\. TESTING REQUIREMENTS

============================================================ 



The calculation engine must have automated/unit tests for its important functions. 



Test: 



\- Normal bill

\- Very low bill

\- High bill

\- Invalid bill

\- Zero rate

\- Negative values

\- Different panel wattages

\- Small roof

\- Large roof

\- Roof-limited system

\- Bill-limited system

\- Zero/invalid solar resource

\- API failure

\- PVGIS fallback

\- NASA failure

\- Claude failure 



The system should never crash because of a normal invalid user input. 



============================================================

42\. FEATURES THAT ARE NOT REQUIRED

============================================================ 



Do NOT add these unless specifically requested by the client: 



\- User login

\- Password authentication

\- E-commerce

\- Online payments

\- Buying solar panels

\- Installer marketplace

\- Shopping cart

\- Custom ML model

\- Computer vision roof detection

\- Automatic AI roof detection

\- Satellite-image segmentation

\- 3D roof modelling

\- IoT monitoring

\- Mobile application

\- Complex admin dashboard

\- Chatbot 



The user manually traces the roof. 



The purpose is preliminary solar estimation and pre-sales assistance. 



============================================================

43\. FEATURES THAT MUST NOT BE REMOVED

============================================================ 



These are core requirements: 



1\. GPS/manual location

2\. Satellite map

3\. Mandatory manual roof tracing

4\. Leaflet.draw

5\. Turf.js roof-area calculation

6\. Monthly bill input

7\. Per-unit rate input

8\. Panel selection

9\. PVGIS

10\. NASA POWER fallback

11\. Deterministic calculation engine

12\. Roof-based system limitation

13\. Generation estimate

14\. Savings estimate

15\. Cost estimate

16\. Applicable subsidy calculation

17\. Payback estimate

18\. Environmental impact

19\. Results dashboard

20\. Claude AI explanation

21\. SQLite calculation history

22\. Proper error handling 



============================================================

44\. CLIENT-FACING DISCLAIMER

============================================================ 



The application should clearly communicate that results are preliminary estimates. 



It does not replace: 



\- Physical site inspection

\- Structural assessment

\- Electrical assessment

\- Final solar system engineering

\- Final installation quotation

\- Utility approval

\- Subsidy eligibility verification

\- Final net-metering approval 



Final decisions should be verified by Sungroves Innovations LLP and appropriate authorities/professionals. 



============================================================

45\. TARGET USERS

============================================================ 



Primary target: 



Residential customers in Maharashtra, India. 



Secondary target: 



Small commercial customers where appropriate. 



The application is intended primarily as a pre-sales estimation tool for Sungroves Innovations LLP. 



============================================================

46\. CORE END-TO-END DEMONSTRATION

============================================================ 



The complete system should demonstrate: 



User opens application

        ↓

Detects or enters location

        ↓

Satellite map loads

        ↓

User traces roof

        ↓

Turf calculates roof area

        ↓

System calculates usable roof area

        ↓

User enters monthly bill

        ↓

User enters per-unit rate

        ↓

User selects panel wattage

        ↓

Backend retrieves solar data

        ↓

Calculation engine determines:

    - consumption

    - bill-based system size

    - roof-based system size

    - final system size

    - panel count

    - generation

    - savings

    - cost

    - subsidy

    - net cost

    - payback

    - CO2 impact

        ↓

Results displayed

        ↓

Claude explains the already-calculated results

        ↓

Calculation saved to SQLite 



The final experience should answer: 



"Given this customer's location, roof space, electricity usage, and selected panel type, what preliminary rooftop solar system could be suitable, what might it generate, what might it save, what might it cost, and what is the estimated environmental impact?" 



============================================================

47\. FINAL IMPLEMENTATION PRINCIPLE

============================================================ 



The user provides the information. 



The map provides the roof geometry. 



The solar APIs provide solar-resource data. 



The deterministic calculation engine performs the mathematics. 



The database stores calculation history. 



Claude explains the calculated result. 



The frontend provides the user experience. 



The backend securely connects everything. 



Build the system as a real client-facing sponsored MVP. 



Prioritize the core end-to-end workflow and reliability. 



Do not fake core functionality. 



Do not use AI where deterministic code is more appropriate. 



Do not over-engineer features outside the requirements. 



Most importantly: 



BUILD, TEST, FIX, AND VERIFY EACH CHUNK BEFORE MOVING TO THE NEXT ONE.

