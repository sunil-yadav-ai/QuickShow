import { useEffect } from "react";
import { SITE_URL, DEFAULT_OG_IMAGE } from "../config/site";

const setMeta = (attribute, key, content) => {
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }

    element.setAttribute("content", content);
};

const SEO = ({
    title = "QuickShow - Book Movie Tickets Online",
    description = "Discover movies, explore trailers and showtimes, and book cinema tickets online with QuickShow.",
    image = DEFAULT_OG_IMAGE,
    noIndex = false,
}) => {
    useEffect(() => {
        const canonicalUrl = `${SITE_URL}${window.location.pathname}`;
        const absoluteImage = new URL(image, SITE_URL).toString();

        document.title = title;
        setMeta("name", "description", description);
        setMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
        setMeta("property", "og:type", "website");
        setMeta("property", "og:site_name", "QuickShow");
        setMeta("property", "og:title", title);
        setMeta("property", "og:description", description);
        setMeta("property", "og:url", canonicalUrl);
        setMeta("property", "og:image", absoluteImage);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta("name", "twitter:title", title);
        setMeta("name", "twitter:description", description);
        setMeta("name", "twitter:image", absoluteImage);

        let canonical = document.head.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement("link");
            canonical.rel = "canonical";
            document.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl;
    }, [description, image, noIndex, title]);

    return null;
};

export default SEO;
