import React, { useState, useEffect } from 'react';
import { Button, Checkbox, FormControlLabel, TextField, Container, Typography, Box } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { NoticesServedResponse, FormData, PrivacyNotice, PrivacyExperience } from './interfaces'
import { ReactComponent as Logo } from './fideslogo.svg';

/**
 * Detailed Consent Process:
 * 
 * 1. Initialization:
 *    a. On component load, the `useEffect` is triggered.
 *    b. A check is made for the presence of the 'fides_consent' cookie.
 *       i. If the cookie does not exist:
 *          - A new cookie is created.
 *          - This cookie contains default values with advertising and email signup set to false.
 *          - A unique device ID (`uuidv4()`) is generated and stored in the cookie. Fides.js would do this already.
 *          - Note - not shown, but you can query the Fides CMP APIs and populate the cookie if you know the user already to retrieve prior preferences.
 * 
 * 2. User Location and Relevant Notices:
 *    a. The component fetches the user's geographic location using the LOCATION_ENDPOINT API.
 *    b. The user's region is determined from the response.
 *    c. Using this region:
 *       i. A call is made to the FIDES_API_ENDPOINT to retrieve relevant privacy experiences for that region.
 *       ii. From the returned privacy experiences, the system filters out the specific privacy notice relevant for "signup".
 *       iii. A record is created on the FIDES_API_ENDPOINT to indicate that this specific privacy notice was served to the user. This is done by calling the `notices-served` endpoint.
 * 
 * 3. Display and User Interaction:
 *    a. The main form display contains:
 *       i. Input fields for the user's name and email.
 *       ii. A dynamic checkbox for user consent, populated with the privacy notice description retrieved from the FIDES API.
 *    b. If the user had previously given or declined consent (as inferred from the 'fides_consent' cookie), their choice is pre-filled in the checkbox.
 *    c. The user makes a choice (either providing or declining consent) and submits the form.
 * 
 * 4. Recording Consent:
 *    a. Upon form submission:
 *       i. The 'fides_consent' cookie is updated to reflect the user's choice.
 *       ii. A request is made to the FIDES_API_ENDPOINT to record the user's privacy preferences.
 *          - This includes details such as the user's consent choice, device ID, geographic location, and the specific notice they interacted with.
 * 
 * Note: The entire process ensures that user's choices regarding their privacy preferences are both stored locally (in the cookie) and remotely (on the server using the FIDES API).
 */


const LOCATION_ENDPOINT = 'https://cdn-api.ethyca.com/location';
const FIDES_API_ENDPOINT = 'http://localhost:8080';

const App = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    consent: false
  });
  const [deviceId, setDeviceId] = useState('');
  const [userGeo, setUserGeo] = useState('');
  const [privacyNotice, setPrivacyNotice] = useState<PrivacyNotice>({} as PrivacyNotice);
  const [noticeServed, setNoticeServed] = useState<NoticesServedResponse>({} as NoticesServedResponse);
  const [privacyExperience, setPrivacyExperience] = useState<PrivacyExperience>({} as PrivacyExperience);

  // Event Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, consent: e.target.checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateConsentCookie();
    recordConsentOnServer();
  };


// This function encodes the content of a cookie.
const encodeCookie = (value: string) => {
  return encodeURIComponent(value);
}

// This function decodes the content of a cookie.
const decodeCookie = (value: string) => {
  return decodeURIComponent(value);
}

const updateConsentCookie = () => {
  const consentCookieData = getCookie('fides_consent');
  if (consentCookieData) {
    const parsedData = JSON.parse(consentCookieData);
    parsedData.consent.advertising_and_email_signup = formData.consent;
    document.cookie = `fides_consent=${encodeCookie(JSON.stringify(parsedData))}; path=/; max-age=31536000`;
  }
};

const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeCookie(parts.pop()?.split(";")[0] || "");
  }
};


  const recordConsentOnServer = async () => {
    const bodyData = {
      browser_identity: { fides_user_device_id: deviceId },
      preferences: [{
        privacy_notice_history_id: privacyNotice.privacy_notice_history_id,
        preference: formData.consent ? "opt_in" : "opt_out",
        served_notice_history_id: noticeServed.served_notice_history_id
      }],
      privacy_experience_id: privacyExperience.id,
      user_geography: userGeo,
      method: "button"
    };

    await fetch(`${FIDES_API_ENDPOINT}/api/v1/privacy-preferences`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
      method: "PATCH"
    });
  };

  // Cookie Logic
  const setOrCheckFidesConsentCookie = () => {
    const cookieName = 'fides_consent';
    const existingCookieValue = getCookie(cookieName);
    if (existingCookieValue) return JSON.parse(existingCookieValue);

    const consentObject = {
      consent: { advertising_and_email_signup: false },
      identity: { fides_user_device_id: uuidv4() },
      fides_meta: {
        version: "0.9.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    document.cookie = `${cookieName}=${JSON.stringify(consentObject)}; path=/; max-age=31536000`;
    return consentObject;
  };

  useEffect(() => {
    const consentData = setOrCheckFidesConsentCookie();
    const fidesDeviceId = consentData.identity.fides_user_device_id;
    const fetchRegionAndNotices = async () => {
      try {

        // #1 Figure out where the user is
        const locationData = await (await fetch(LOCATION_ENDPOINT)).json();
        const userGeo = locationData?.location.toLowerCase().replace("-", "_");
        const region = locationData?.country;

        if (region) {

          // #2 Fetch the appropriate privacy experiences based off the region
          const noticesData = await fetchPrivacyExperiences(region.toLowerCase());

          // #3 Process the notice and indicate that the notice was served.
          if (noticesData) processNotices(noticesData, fidesDeviceId, userGeo);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const fetchPrivacyExperiences = async (region: string) => {
      const response = await fetch(`${FIDES_API_ENDPOINT}/api/v1/privacy-experience?show_disabled=true&region=${region}&systems_applicable=false&page=1&size=50`);
      return await response.json();
    };

    const processNotices = async (noticesData: any, fidesDeviceId: string, userGeo: string) => {
      const noticeData = noticesData.items[0];

      // Go through all of the privacy notices and look for the earmarked ones that end in "signup"
      // indicating we should serve it here
      const signUpNotice = noticeData?.privacy_notices?.find((notice: any) => notice.notice_key?.endsWith("signup"));
      const noticesServedBody = {
        acknowledge_mode: false,
        browser_identity: { fides_user_device_id: fidesDeviceId },
        privacy_experience_id: noticeData.id,
        privacy_notice_history_ids: [signUpNotice["privacy_notice_history_id"]],
        serving_component: "overlay",
        user_geography: userGeo
      };
      const noticesServedResponse = await (await fetch(`${FIDES_API_ENDPOINT}/api/v1/notices-served`, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticesServedBody),
        method: "PATCH"
      })).json() as NoticesServedResponse[];

      setPrivacyNotice(signUpNotice);
      setDeviceId(fidesDeviceId);
      setNoticeServed(noticesServedResponse[0]);
      setUserGeo(userGeo);
      setPrivacyExperience(noticeData);
    };

    fetchRegionAndNotices();
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh', // This ensures it takes up the full viewport height
      }}
    >
      <Container component="main" maxWidth="xs">
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            mt: 3,
            p: 3,
            borderRadius: '8px',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#ffffff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Logo />  {/* Display the SVG */}
          </Box>
          <TextField variant="outlined" margin="normal" required fullWidth id="name" label="Name" name="name" value={formData.name} onChange={handleInputChange} sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: 'rgb(17, 20, 57)',
              },
            },
            '& .MuiInputLabel-root': {
              '&.Mui-focused': {
                color: 'rgb(17, 20, 57)', // Custom color for the label when focused
              },
            },

          }} />
          <TextField variant="outlined" margin="normal" required fullWidth id="email" label="Email Address" name="email" value={formData.email} onChange={handleInputChange} sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: 'rgb(17, 20, 57)',
              },
            },
            '& .MuiInputLabel-root': {
              '&.Mui-focused': {
                color: 'rgb(17, 20, 57)', // Custom color for the label when focused
              },
            },
          }} />
          {privacyNotice?.description && (<FormControlLabel control={<Checkbox value={formData.consent} name="consent" checked={formData.consent} onChange={handleCheckboxChange} sx={{ color: 'rgb(17, 20, 57)', '&.Mui-checked': { color: 'rgb(17, 20, 57)' } }} 
          />} label={privacyNotice?.description} />)}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 2, backgroundColor: 'rgb(17, 20, 57)', '&:hover': { backgroundColor: 'rgb(12, 15, 47)' } }} 
            disabled={!privacyNotice?.description}
          >
            Submit
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default App;
