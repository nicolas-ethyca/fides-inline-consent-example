export interface NoticesServedResponse {
    id: string;
    updated_at: string;
    privacy_notice_history: {
        name: string;
        notice_key: string;
        description: string;
        internal_description: string | null;
        origin: string | null;
        regions: string[];
        consent_mechanism: string;
        data_uses: string[];
        enforcement_level: string;
        disabled: boolean;
        has_gpc_flag: boolean;
        displayed_in_privacy_center: boolean;
        displayed_in_overlay: boolean;
        displayed_in_api: boolean;
        id: string;
        version: number;
        privacy_notice_id: string;
    };
    served_notice_history_id: string;
}

export interface FormData {
    name: string;
    email: string;
    consent: boolean;
}

export interface Cookie {
    name: string;
    path: string;
    domain: null;
}

export interface PrivacyNotice {
    name: string;
    notice_key: string;
    description: string;
    internal_description: null;
    origin: null;
    regions: string[];
    consent_mechanism: string;
    data_uses: string[];
    enforcement_level: string;
    disabled: boolean;
    has_gpc_flag: boolean;
    displayed_in_privacy_center: boolean;
    displayed_in_overlay: boolean;
    displayed_in_api: boolean;
    id: string;
    created_at: string;
    updated_at: string;
    version: number;
    privacy_notice_history_id: string;
    cookies: Cookie[];
}

export interface PrivacyExperience {
    region: string;
    component: string;
    experience_config: {
        accept_button_label: string;
        acknowledge_button_label: string;
        banner_enabled: string;
        description: string;
        disabled: boolean;
        is_default: boolean;
        privacy_policy_link_label: string;
        privacy_policy_url: string | null;
        privacy_preferences_link_label: string;
        regions: string[];
        reject_button_label: string;
        save_button_label: string;
        title: string;
        id: string;
        component: string;
        experience_config_history_id: string;
        version: number;
        created_at: string;
        updated_at: string;
    };
    id: string;
    created_at: string;
    updated_at: string;
    show_banner: boolean;
    privacy_notices: (
        PrivacyNotice & {
            default_preference: string;
            current_preference: string | null;
            outdated_preference: string | null;
            current_served: string | null;
            outdated_served: string | null;
        })[];
}
