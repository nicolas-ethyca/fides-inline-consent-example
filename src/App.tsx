import React, { useState, useEffect } from 'react';
import { Button, Checkbox, FormControlLabel, TextField, Container, Typography, Box } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { NoticesServedResponse, FormData, PrivacyNotice, PrivacyExperience } from './interfaces'
import { ReactComponent as Logo } from './fideslogo.svg';


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


  // Consent Logic
  const updateConsentCookie = () => {
    const consentCookieData = getCookie('fides_consent');
    if (consentCookieData) {
      const parsedData = JSON.parse(consentCookieData);
      parsedData.consent.advertising_and_email_signup = formData.consent;
      document.cookie = `fides_consent=${JSON.stringify(parsedData)}; path=/; max-age=31536000`;
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

  const getCookie = (name: string): string | undefined => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";")[0];
    }
  };

  useEffect(() => {
    const consentData = setOrCheckFidesConsentCookie();
    const fidesDeviceId = consentData.identity.fides_user_device_id;
    const fetchRegionAndNotices = async () => {
      try {
        const locationData = await (await fetch(LOCATION_ENDPOINT)).json();
        const userGeo = locationData?.location.toLowerCase().replace("-", "_");
        const region = locationData?.country;

        if (region) {
          const noticesData = await fetchNotices(region.toLowerCase());
          if (noticesData) processNotices(noticesData, fidesDeviceId, userGeo);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const fetchNotices = async (region: string) => {
      const response = await fetch(`${FIDES_API_ENDPOINT}/api/v1/privacy-experience?show_disabled=true&region=${region}&systems_applicable=false&page=1&size=50`);
      return await response.json();
    };

    const processNotices = async (noticesData: any, fidesDeviceId: string, userGeo: string) => {
      const noticeData = noticesData.items[0];
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
          {privacyNotice?.description && (<FormControlLabel control={<Checkbox value={formData.consent} name="consent" checked={formData.consent} onChange={handleCheckboxChange} sx={{ color: 'rgb(17, 20, 57)', '&.Mui-checked': { color: 'rgb(17, 20, 57)' } }} // Customize the color here
          />} label={privacyNotice?.description} />)}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 2, backgroundColor: 'rgb(17, 20, 57)', '&:hover': { backgroundColor: 'rgb(12, 15, 47)' } }} // Customize the color here
          >
            Submit
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default App;
