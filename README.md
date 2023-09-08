# Fides Accord Example - Consent Process with API Calls

![Fides banner](https://github.com/ethyca/fides/blob/main/docs/fides/docs/img/fides-banner.png "Fides banner")

## :zap: Overview

Fides is designed to ensure data privacy compliance. Our sample here showcases the consent management process, specifically detailing API interactions and user interactions for gathering and recording consent.

## :rocket: Consent Process

### Initialization

1. **Component Load and Cookie Check**
    - On load, the `useEffect` gets activated.
    - Searches for the 'fides_consent' cookie.
        * If absent: 
            + A cookie with default values is created.
            + A unique device ID is generated and saved in the cookie.

### User Location and Notices

2. **Fetching User Geographic Data**
    - Calls LOCATION_ENDPOINT API to get the user's location.
    - Determines the user's region from the API response.
    - Using this region:
        * Privacy experiences related to this region are retrieved via FIDES_API_ENDPOINT.
        * From these, filters out the "signup" privacy notice.
        * A record is created at `notices-served` endpoint on FIDES_API_ENDPOINT.

### Display & Interaction

3. **Form Display & User Input**
    - The form showcases:
        * Fields for name and email.
        * Dynamic checkbox for user consent.
    - If a prior choice was made, this choice pre-fills the checkbox.
    - Users select their choice and submit.

### Recording Consent

4. **On Form Submission**
    - The 'fides_consent' cookie updates reflecting the user's choice.
    - FIDES_API_ENDPOINT records the user's privacy preferences.

## :books: Insights

### Cookie-based Local Storage

The system uses cookies to store the user's consent choices locally. This provides quick retrieval for future interactions without constantly querying the server.

### Server-side Recording

For auditability and compliance, all user interactions related to their consent are also recorded on the server using FIDES API, ensuring that any regulatory requirements are met.

## :bulb: Additional Information

### Documentation & Further Reading

* [Fides official documentation](https://docs.ethyca.com)
* [Fides API references](https://docs.ethyca.com/fides/api)

### Support & Interaction

Engage with the community:

* [Slack](https://fid.es/join-slack)
* [Twitter](https://twitter.com/ethyca)
* [Discussions](https://github.com/ethyca/fides/discussions)

### Contributions

Your inputs and improvements are welcome! Check out our [contribution guidelines](https://docs.ethyca.com/fides/community/overview) for further details.

## :balance_scale: License

Fides tools are licensed under the [Apache Software License Version 2.0](https://www.apache.org/licenses/LICENSE-2.0).



## Available Scripts

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.
