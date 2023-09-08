import React, { useState, useEffect } from 'react';
import { Button, Checkbox, FormControlLabel, TextField, Container, Typography } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { NoticesServedResponse, FormData, PrivacyNotice, PrivacyExperience } from './interfaces'


const locationEndpoint = 'https://cdn-api.ethyca.com/location';
const fidesAPIendpoint = 'http://localhost:8080';

const App = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    consent: false
  });
  const [deviceId, setDeviceId] = useState('');
  const [userGeo, setUserGeo] = useState('');
  const [privacyNotice, setPrivacyNotice] = useState({} as PrivacyNotice);
  const [noticeServed, setNoticeServed] = useState({} as NoticesServedResponse);
  const [privacyExperience, setPrivacyExperience] = useState({} as PrivacyExperience)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      consent: e.target.checked
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Record consent
    if (formData.consent) {

      // Update the fides_consent cookie
      const consentCookieData = getCookie('fides_consent');
      if (consentCookieData) {
        const parsedData = JSON.parse(consentCookieData);
        parsedData.consent.advertising_and_email_signup = true;
        document.cookie = `fides_consent=${JSON.stringify(parsedData)}; path=/; max-age=31536000`;
      }

      // construct body to record consent on server
      const browserIdentity = {
        fides_user_device_id: deviceId
      };

      const preferences = [{
        privacy_notice_history_id: privacyNotice.privacy_notice_history_id,
        preference: formData.consent ? "opt_in" : "opt_out",
        served_notice_history_id: noticeServed.served_notice_history_id
      }];

      const bodyData = {
        browser_identity: browserIdentity,
        preferences: preferences,
        privacy_experience_id: privacyExperience.id,  // Replace with correct value
        user_geography: userGeo,  // Replace with the appropriate value from location fetch
        method: "button"
      };

      await fetch("http://localhost:8080/api/v1/privacy-preferences", {
        headers: {
          'Content-Type': 'application/json',
        }, body: JSON.stringify(bodyData),
        method: "PATCH"
      });
    }
  };

  // logic to work nice with fides_consent cookie
  function setOrCheckFidesConsentCookie() {
    const cookieName = 'fides_consent';

    // Check if the cookie already exists
    const existingCookieValue = getCookie(cookieName);

    if (existingCookieValue) {
      return JSON.parse(existingCookieValue);
    } else {
      const consentObject = {
        consent: {
          advertising_and_email_signup: false
        },
        identity: {
          fides_user_device_id: uuidv4() // Generate a new UUID if not existing
        },
        fides_meta: {
          version: "0.9.0",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      // Set the cookie
      document.cookie = `${cookieName}=${JSON.stringify(consentObject)}; path=/; max-age=31536000`;

      return consentObject;
    }
  }

  function getCookie(name: string): string | undefined {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) {
      const cookieValue = parts.pop();
      if (cookieValue) {
        return cookieValue.split(";")[0];
      }
    }
    return undefined;
  }


  useEffect(() => {

    const consentData = setOrCheckFidesConsentCookie();
    const fidesDeviceId = consentData.identity.fides_user_device_id;

    const fetchRegionAndNotices = async () => {
      try {
        // 1. Fetch region
        const locationResponse = await fetch(locationEndpoint);
        const locationData = await locationResponse.json();
        const userGeo = locationData?.location.toLowerCase().replace("-", "_")

        console.log(`User's ISO country code is: ${locationData.country}`);

        const region = locationData?.country; // Assume region is a key

        if (region) {
          // 2. Fetch privacy notices based on region and take first item in array
          const regionLowercase = region.toLowerCase();
          const noticesResponse = await fetch(`${fidesAPIendpoint}/api/v1/privacy-experience?show_disabled=true&region=${regionLowercase}&systems_applicable=false&page=1&size=50`, { /* ...headers... */ });
          const noticesData = await noticesResponse.json();

          if (noticesData) {
            const noticeData = noticesData.items[0]
            // Extract privacy notices that ends with "signup"
            const signUpNotice = (noticeData?.privacy_notices?.filter((notice: any) => notice.notice_key?.endsWith("signup")))[0];

            // 3. Record that the notice was shown to this device

            const noticesServedBody = {
              acknowledge_mode: false,
              browser_identity: { fides_user_device_id: fidesDeviceId },
              privacy_experience_id: noticeData.id,
              privacy_notice_history_ids: [
                signUpNotice["privacy_notice_history_id"]
              ],
              serving_component: "overlay",
              user_geography: userGeo
            }

            // Record notice shown
            const noticesServedResponse = await (await fetch(`${fidesAPIendpoint}/api/v1/notices-served`, {
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(noticesServedBody),
              method: "PATCH"
            })).json() as NoticesServedResponse[];

            // You can store these notices in state or handle them as needed
            setPrivacyNotice(signUpNotice);
            setDeviceId(fidesDeviceId);
            setNoticeServed(noticesServedResponse[0]);
            setUserGeo(userGeo);
            setPrivacyExperience(noticeData);
          }

        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchRegionAndNotices();
  }, []);

  return (
    <Container component="main" maxWidth="xs">
      <Typography component="h1" variant="h5">
        Consent Form
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          id="name"
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
        />
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
        />
        {privacyNotice?.description && (<FormControlLabel
          control={
            <Checkbox
              value={formData.consent}
              color="primary"
              name="consent"
              checked={formData.consent}
              onChange={handleCheckboxChange}
            />
          }
          label={privacyNotice?.description}
        />)}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
        >
          Submit
        </Button>
      </form>
    </Container>
  );
}

export default App;
