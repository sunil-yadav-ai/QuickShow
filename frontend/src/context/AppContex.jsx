



import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";

import axios from "axios";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const getSafeTokenDiagnostics = (token) => {
    const parts = token.split(".");
    let issuerHost = null;

    if (parts.length === 3) {
        try {
            const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const claims = JSON.parse(
                new TextDecoder().decode(
                    Uint8Array.from(atob(payload), (character) =>
                        character.charCodeAt(0),
                    ),
                ),
            );
            issuerHost = new URL(claims.iss).host;
        } catch {
            issuerHost = null;
        }
    }

    return {
        jwtSegmentCount: parts.length,
        issuerHost,
    };
};

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminLoading, setIsAdminLoading] = useState(true);
    const [adminCheckedUserId, setAdminCheckedUserId] = useState(null);
    const [adminCheckError, setAdminCheckError] = useState(null);
    const [shows, setShows] = useState([]);
    const [favoriteMovies, setFavoriteMovies] = useState([]);

    const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

    const { user, isLoaded: isUserLoaded } = useUser();
    const {
        getToken,
        isSignedIn,
        isLoaded: isAuthLoaded,
    } = useAuth();

    const isLoaded = isUserLoaded && isAuthLoaded;
    const navigate = useNavigate();

    const getAuthorizationHeaders = useCallback(async () => {
        const token = await getToken();

        if (!token) {
            throw new Error("Clerk session token is missing");
        }

        if (import.meta.env.DEV) {
            console.info("Clerk session token diagnostics", {
                ...getSafeTokenDiagnostics(token),
            });
        }

        return { Authorization: `Bearer ${token}` };
    }, [getToken]);

    // Check whether the logged-in user is an admin
    const fetchIsAdmin = useCallback(async () => {
        if (!isLoaded) return;

        if (!isSignedIn || !user) {
            setIsAdmin(false);
            setIsAdminLoading(false);
            return;
        }

        setIsAdminLoading(true);

        try {
            const headers = await getAuthorizationHeaders();

            if (import.meta.env.DEV) {
                console.info("Checking admin access", {
                    signedIn: isSignedIn,
                    clerkUserId: user.id,
                    tokenAvailable: Boolean(headers.Authorization),
                    backendUrl: axios.defaults.baseURL,
                });
            }

            const response = await axios.get("/api/admin/is-admin", {
                headers,
            });
            const { data } = response;

            const admin =
                data.success === true &&
                data.isAdmin === true;

            if (import.meta.env.DEV) {
                console.info("Admin access response", {
                    status: response.status,
                    success: data.success,
                    isAdmin: data.isAdmin,
                    clerkUserId: user.id,
                });
            }

            setIsAdmin(admin);
            setAdminCheckedUserId(user.id);
            setAdminCheckError(null);
        } catch (error) {
            setIsAdmin(false);
            setAdminCheckError({
                status: error.response?.status ?? null,
                message: error.response?.data?.message ?? error.message,
            });

            console.error("Admin verification failed:", {
                status: error.response?.status,
                responseBody: {
                    success: error.response?.data?.success,
                    isAdmin: error.response?.data?.isAdmin,
                    message: error.response?.data?.message,
                    diagnostics: error.response?.data?.diagnostics,
                },
                message: error.message,
            });

            setAdminCheckedUserId(user.id);
        } finally {
            setIsAdminLoading(false);
        }
    }, [
        isLoaded,
        isSignedIn,
        user,
        getAuthorizationHeaders,
    ]);

    // Fetch all shows
    const fetchShows = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/show/all");

            if (data.success) {
                setShows(data.shows ?? []);
            } else {
                console.error("Fetch shows failed:", data.message);
            }
        } catch (error) {
            console.error(
                "Fetch shows failed:",
                error.response?.data || error.message
            );
        }
    }, []);

    // Fetch favorite movies
    const fetchFavoriteMovie = useCallback(async () => {
        if (!isLoaded) return;

        if (!isSignedIn || !user) {
            setFavoriteMovies([]);
            return;
        }

        try {
            const headers = await getAuthorizationHeaders();

            const { data } = await axios.get("/api/user/favorites", {
                headers,
            });

            if (data.success) {
                setFavoriteMovies(data.movies ?? []);
            }
        } catch (error) {
            console.error("Fetch favorites failed:", {
                status: error.response?.status,
                responseBody: {
                    success: error.response?.data?.success,
                    message: error.response?.data?.message,
                    diagnostics: error.response?.data?.diagnostics,
                },
                message: error.message,
            });
        }
    }, [isLoaded, isSignedIn, user, getAuthorizationHeaders]);

    // Load shows
    useEffect(() => {
        fetchShows();
    }, [fetchShows]);

    // Verify admin access
    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn || !user) {
            setIsAdmin(false);
            setIsAdminLoading(false);
            setAdminCheckedUserId(null);
            setAdminCheckError(null);
            setFavoriteMovies([]);
            return;
        }

        setIsAdminLoading(true);
        setAdminCheckError(null);
        fetchIsAdmin();
    }, [
        isLoaded,
        isSignedIn,
        user,
        fetchIsAdmin,
    ]);

    // Load favorite movies
    useEffect(() => {
        if (!isLoaded) return;

        fetchFavoriteMovie();
    }, [isLoaded, isSignedIn, user, fetchFavoriteMovie]);

    const value = {
        axios,
        user,
        isLoaded,
        isSignedIn,
        getToken,
        navigate,
        isAdmin,
        isAdminLoading,
        adminCheckedUserId,
        adminCheckError,
        shows,
        favoriteMovies,
        fetchShows,
        fetchIsAdmin,
        fetchFavoriteMovie,
        image_base_url,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);