import { Link } from "react-router-dom";
import SEO from "../components/SEO";

const NotFound = () => (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 pt-28 text-center">
        <SEO
            title="Page not found | QuickShow"
            description="The QuickShow page you requested could not be found."
            noIndex
        />
        <h1 className="text-3xl font-semibold sm:text-5xl">Page not found</h1>
        <p className="mt-4 max-w-xl text-gray-300">
            That page may have moved. Browse the current movies to find your next show.
        </p>
        <Link
            to="/movies"
            className="mt-7 rounded-full bg-primary px-6 py-3 font-medium transition hover:bg-primary-dull focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
            Browse movies
        </Link>
    </main>
);

export default NotFound;
