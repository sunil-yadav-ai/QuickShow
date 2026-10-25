
import axios from "axios";
import Movie from "../models/movie.js";
import Show from "../models/show.js";

// API to get now-playing movies
export const getNowPlayingMovies = async (req, res) => {
    try {
        const { data } = await axios.get(
            "https://api.themoviedb.org/3/movie/now_playing",
            {
                headers: {
                    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                },
            }
        );

        return res.json({
            success: true,
            movies: data.results,
        });

    } catch (error) {
        console.error(
            "getNowPlayingMovies error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// API to add a new show
export const addShow = async (req, res) => {
    try {
        // Accept either movie_id or movieId from the frontend
        const movie_id = req.body.movie_id || req.body.movieId;
        const { showInput, showPrice } = req.body;

        if (!movie_id || !Array.isArray(showInput) || showInput.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Movie ID and show timings are required.",
            });
        }

        let movie = await Movie.findById(movie_id);

        // Fetch movie details and cast if movie is not in database
        if (!movie) {
            const [detailsResponse, creditsResponse] = await Promise.all([
                axios.get(
                    `https://api.themoviedb.org/3/movie/${movie_id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                        },
                    }
                ),

                axios.get(
                    `https://api.themoviedb.org/3/movie/${movie_id}/credits`,
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                        },
                    }
                ),
            ]);

            const movieApiData = detailsResponse.data;
            const movieCreditsData = creditsResponse.data;

            const movieDetails = {
                _id: movie_id,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres,
                casts: movieCreditsData.cast || [],
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
            };

            movie = await Movie.create(movieDetails);

            console.log("New movie saved:", movie.title);
            console.log("Cast saved:", movie.casts.length);
        }

        // Create show entries
        const showsToCreate = [];

        showInput.forEach((showItem) => {
            if (!showItem.date || !Array.isArray(showItem.time)) {
                return;
            }

            showItem.time.forEach((time) => {
                const dateTimeString = `${showItem.date}T${time}`;

                showsToCreate.push({
                    movie: movie_id,
                    showDateTime: new Date(dateTimeString),
                    showPrice: Number(showPrice),
                    occupiedSeats: {},
                });
            });
        });

        if (showsToCreate.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid show timings were provided.",
            });
        }

        await Show.insertMany(showsToCreate);

        return res.json({
            success: true,
            message: "Show added successfully.",
        });

    } catch (error) {
        console.error(
            "addShow error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// API to get all upcoming shows
export const getShows = async (req, res) => {
    try {
        const shows = await Show.find({
            showDateTime: { $gte: new Date() },
        })
            .populate("movie")
            .sort({ showDateTime: 1 });

        // Return unique movies
        const uniqueShows = new Map();

        shows.forEach((item) => {
            if (item.movie) {
                uniqueShows.set(String(item.movie._id), item.movie);
            }
        });

        return res.json({
            success: true,
            shows: Array.from(uniqueShows.values()),
        });

    } catch (error) {
        console.error(
            "getShows error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// API to get a particular movie and its upcoming show timings
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;

        console.log("getShow called for movie:", movieId);

        const movie = await Movie.findById(movieId);

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found in database.",
            });
        }

        console.log("Cast count before fetching:", movie.casts?.length ?? 0);

        // IMPORTANT: Fetch cast for movies already saved without cast data
        if (!movie.casts || movie.casts.length === 0) {
            const { data } = await axios.get(
                `https://api.themoviedb.org/3/movie/${movieId}/credits`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                    },
                }
            );

            console.log("Cast received from TMDB:", data.cast?.length ?? 0);

            movie.casts = data.cast || [];
            await movie.save();

            console.log("Cast saved in database:", movie.casts.length);
        }

        const shows = await Show.find({
            movie: movieId,
            showDateTime: { $gte: new Date() },
        }).sort({ showDateTime: 1 });

        const dateTime = {};

        shows.forEach((showItem) => {
            const date = showItem.showDateTime.toISOString().split("T")[0];

            if (!dateTime[date]) {
                dateTime[date] = [];
            }

            dateTime[date].push({
                time: showItem.showDateTime,
                showId: showItem._id,
            });
        });

        return res.json({
            success: true,
            movie,
            dateTime,
        });

    } catch (error) {
        console.error(
            "getShow error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

