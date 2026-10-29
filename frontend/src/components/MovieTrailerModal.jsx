import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const MovieTrailerModal = ({ movieTitle, videoKey, onClose }) => {
    const closeButtonRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previouslyFocusedElement = document.activeElement;
        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        const closeOnEscape = (event) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
            previouslyFocusedElement?.focus?.();
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="movie-trailer-title"
                className="w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-gray-950 shadow-2xl"
            >
                <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <h2
                        id="movie-trailer-title"
                        className="truncate text-base font-semibold text-white sm:text-lg"
                    >
                        {movieTitle} trailer
                    </h2>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close trailer"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                </div>

                <div className="relative aspect-video w-full bg-black">
                    {!hasError && (
                        <iframe
                            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0`}
                            title={`${movieTitle} trailer`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setHasError(true);
                                setIsLoading(false);
                            }}
                            className="absolute inset-0 h-full w-full border-0"
                        />
                    )}

                    {isLoading && !hasError && (
                        <div
                            role="status"
                            className="absolute inset-0 grid place-items-center bg-gray-950 text-sm text-gray-200"
                        >
                            Loading trailer…
                        </div>
                    )}

                    {hasError && (
                        <p
                            role="alert"
                            className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-gray-200"
                        >
                            This trailer could not be played. Please try again later.
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default MovieTrailerModal;
