
// import axios from "axios";
// import Movie from "../models/movie.js";
// import Show from "../models/show.js";

// // API to get now-playing movies
// export const getNowPlayingMovies = async (req, res) => {
//     try {
//         const { data } = await axios.get(
//             "https://api.themoviedb.org/3/movie/now_playing",
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
//                 },
//             }
//         );

//         return res.json({
//             success: true,
//             movies: data.results,
//         });

//     } catch (error) {
//         console.error(
//             "getNowPlayingMovies error:",
//             error.response?.data || error.message
//         );

//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };


// // API to add a new show
// export const addShow = async (req, res) => {
//     try {
//         // Accept either movie_id or movieId from the frontend
//         const movie_id = req.body.movie_id || req.body.movieId;
//         const { showInput, showPrice } = req.body;

//         if (!movie_id || !Array.isArray(showInput) || showInput.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Movie ID and show timings are required.",
//             });
//         }

//         let movie = await Movie.findById(movie_id);

//         // Fetch movie details and cast if movie is not in database
//         if (!movie) {
//             const [detailsResponse, creditsResponse] = await Promise.all([
//                 axios.get(
//                     `https://api.themoviedb.org/3/movie/${movie_id}`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
//                         },
//                     }
//                 ),

//                 axios.get(
//                     `https://api.themoviedb.org/3/movie/${movie_id}/credits`,
//                     {
//                         headers: {
//                             Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
//                         },
//                     }
//                 ),
//             ]);

//             const movieApiData = detailsResponse.data;
//             const movieCreditsData = creditsResponse.data;

//             const movieDetails = {
//                 _id: movie_id,
//                 title: movieApiData.title,
//                 overview: movieApiData.overview,
//                 poster_path: movieApiData.poster_path,
//                 backdrop_path: movieApiData.backdrop_path,
//                 genres: movieApiData.genres,
//                 casts: movieCreditsData.cast || [],
//                 release_date: movieApiData.release_date,
//                 original_language: movieApiData.original_language,
//                 tagline: movieApiData.tagline || "",
//                 vote_average: movieApiData.vote_average,
//                 runtime: movieApiData.runtime,
//             };

//             movie = await Movie.create(movieDetails);

//             console.log("New movie saved:", movie.title);
//             console.log("Cast saved:", movie.casts.length);
//         }

//         // Create show entries
//         const showsToCreate = [];

//         showInput.forEach((showItem) => {
//             if (!showItem.date || !Array.isArray(showItem.time)) {
//                 return;
//             }

//             showItem.time.forEach((time) => {
//                 const dateTimeString = `${showItem.date}T${time}`;

//                 showsToCreate.push({
//                     movie: movie_id,
//                     showDateTime: new Date(dateTimeString),
//                     showPrice: Number(showPrice),
//                     occupiedSeats: {},
//                 });
//             });
//         });

//         if (showsToCreate.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No valid show timings were provided.",
//             });
//         }

//         await Show.insertMany(showsToCreate);

//         return res.json({
//             success: true,
//             message: "Show added successfully.",
//         });

//     } catch (error) {
//         console.error(
//             "addShow error:",
//             error.response?.data || error.message
//         );

//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };


// // API to get all upcoming shows
// export const getShows = async (req, res) => {
//     try {
//         const shows = await Show.find({
//             showDateTime: { $gte: new Date() },
//         })
//             .populate("movie")
//             .sort({ showDateTime: 1 });

//         // Return unique movies
//         const uniqueShows = new Map();

//         shows.forEach((item) => {
//             if (item.movie) {
//                 uniqueShows.set(String(item.movie._id), item.movie);
//             }
//         });

//         return res.json({
//             success: true,
//             shows: Array.from(uniqueShows.values()),
//         });

//     } catch (error) {
//         console.error(
//             "getShows error:",
//             error.response?.data || error.message
//         );

//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };


// // API to get a particular movie and its upcoming show timings
// export const getShow = async (req, res) => {
//     try {
//         const { movieId } = req.params;

//         console.log("getShow called for movie:", movieId);

//         const movie = await Movie.findById(movieId);

//         if (!movie) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Movie not found in database.",
//             });
//         }

//         console.log("Cast count before fetching:", movie.casts?.length ?? 0);

//         // IMPORTANT: Fetch cast for movies already saved without cast data
//         if (!movie.casts || movie.casts.length === 0) {
//             const { data } = await axios.get(
//                 `https://api.themoviedb.org/3/movie/${movieId}/credits`,
//                 {
//                     headers: {
//                         Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
//                     },
//                 }
//             );

//             console.log("Cast received from TMDB:", data.cast?.length ?? 0);

//             movie.casts = data.cast || [];
//             await movie.save();

//             console.log("Cast saved in database:", movie.casts.length);
//         }

//         const shows = await Show.find({
//             movie: movieId,
//             showDateTime: { $gte: new Date() },
//         }).sort({ showDateTime: 1 });

//         const dateTime = {};

//         shows.forEach((showItem) => {
//             const date = showItem.showDateTime.toISOString().split("T")[0];

//             if (!dateTime[date]) {
//                 dateTime[date] = [];
//             }

//             dateTime[date].push({
//                 time: showItem.showDateTime,
//                 showId: showItem._id,
//             });
//         });

//         return res.json({
//             success: true,
//             movie,
//             dateTime,
//         });

//     } catch (error) {
//         console.error(
//             "getShow error:",
//             error.response?.data || error.message
//         );

//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };















import axios from "axios";
import Movie from "../models/movie.js";
import Show from "../models/show.js";
import { inngest } from "../inggest/client.js";

// ==========================================
// API: Get Now Playing Movies
// ==========================================
export const getNowPlayingMovies = async (req, res) => {
    try {
        if (!process.env.TMDB_ACCESS_TOKEN) {
            throw new Error("TMDB_ACCESS_TOKEN is missing in backend environment");
        }

        const { data } = await axios.get(
            "https://api.themoviedb.org/3/movie/now_playing",
            {
                headers: {
                    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                },
                timeout: 15000,
            }
        );

        return res.status(200).json({
            success: true,
            movies: data.results || [],
        });

    } catch (error) {
        console.error("[getNowPlayingMovies] Error:", error.message);
        console.error("[getNowPlayingMovies] Code:", error.code || "N/A");

        if (error.response) {
            console.error(
                "[getNowPlayingMovies] TMDB status:",
                error.response.status
            );
        }

        return res.status(500).json({
            success: false,
            message: "Unable to fetch movies. Please try again.",
        });
    }
};


// ==========================================
// API: Add a New Show
// ==========================================
export const addShow = async (req, res) => {
    let currentStep = "Validating request";

    try {
        const movie_id = req.body.movie_id || req.body.movieId;
        const { showInput, showPrice } = req.body;

        // Validate movie ID
        if (!movie_id) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required.",
            });
        }

        // Validate show timings
        if (!Array.isArray(showInput) || showInput.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one show date and time.",
            });
        }

        // Validate price
        const price = Number(showPrice);

        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Show price must be a positive number.",
            });
        }

        console.log("[addShow] Movie ID:", movie_id);

        // Step 1: Find movie in database
        currentStep = "Finding movie in MongoDB";

        let movie = await Movie.findById(movie_id);

        // Step 2: Fetch movie details if movie doesn't exist
        if (!movie) {
            if (!process.env.TMDB_ACCESS_TOKEN) {
                throw new Error(
                    "TMDB_ACCESS_TOKEN is missing in backend environment"
                );
            }

            currentStep = "Fetching movie details from TMDB";

            const detailsResponse = await axios.get(
                `https://api.themoviedb.org/3/movie/${encodeURIComponent(movie_id)}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                    },
                    timeout: 15000,
                }
            );

            currentStep = "Fetching movie credits from TMDB";

            const creditsResponse = await axios.get(
                `https://api.themoviedb.org/3/movie/${encodeURIComponent(movie_id)}/credits`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                    },
                    timeout: 15000,
                }
            );

            const movieApiData = detailsResponse.data;
            const movieCreditsData = creditsResponse.data;

            // Step 3: Save movie
            currentStep = "Saving movie in MongoDB";

            movie = await Movie.create({
                _id: movie_id,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres || [],
                casts: movieCreditsData.cast || [],
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
            });

            console.log("[addShow] Movie saved:", movie.title);
            console.log(
                "[addShow] Cast count:",
                movie.casts?.length ?? 0
            );
        }

        // Step 4: Prepare show documents
        currentStep = "Preparing show timings";

        const showsToCreate = [];

        for (const showItem of showInput) {
            if (
                !showItem ||
                typeof showItem.date !== "string" ||
                !Array.isArray(showItem.time)
            ) {
                continue;
            }

            for (const time of showItem.time) {
                if (typeof time !== "string") {
                    continue;
                }

                const dateTime = new Date(
                    `${showItem.date}T${time}`
                );

                if (Number.isNaN(dateTime.getTime())) {
                    throw new Error(
                        `Invalid show date/time: ${showItem.date} ${time}`
                    );
                }

                showsToCreate.push({
                    movie: movie_id,
                    showDateTime: dateTime,
                    showPrice: price,
                    occupiedSeats: {},
                });
            }
        }

        if (showsToCreate.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid show timings were provided.",
            });
        }

        // Step 5: Insert shows into database
        currentStep = "Inserting shows into MongoDB";

        const createdShows = await Show.insertMany(showsToCreate);

        console.log(
            "[addShow] Successfully created shows:",
            createdShows.length
        );

        //trigger inngesr function
        await inngest.send({
            name:"app/show.added",
            data:{movieTitle:movie.title}
        })

        return res.status(200).json({
            success: true,
            message: "Show added successfully.",
            count: createdShows.length,
        });

    } catch (error) {
        console.error("[addShow] Failed step:", currentStep);
        console.error("[addShow] Error name:", error.name);
        console.error("[addShow] Error code:", error.code || "N/A");
        console.error("[addShow] Error message:", error.message);

        if (error.response) {
            console.error(
                "[addShow] External API status:",
                error.response.status
            );

            console.error(
                "[addShow] External API response:",
                error.response.data
            );
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to add show.",
            failedStep: currentStep,
        });
    }
};


// ==========================================
// API: Get All Upcoming Shows
// ==========================================
export const getShows = async (req, res) => {
    try {
        const shows = await Show.find({
            showDateTime: {
                $gte: new Date(),
            },
        })
            .populate("movie")
            .sort({
                showDateTime: 1,
            });

        const uniqueShows = new Map();

        for (const show of shows) {
            if (show.movie) {
                uniqueShows.set(
                    String(show.movie._id),
                    show.movie
                );
            }
        }

        return res.status(200).json({
            success: true,
            shows: Array.from(uniqueShows.values()),
        });

    } catch (error) {
        console.error("[getShows] Error:", error.message);
        console.error("[getShows] Code:", error.code || "N/A");

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// ==========================================
// API: Get Movie Details and Show Timings
// ==========================================
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;

        console.log("[getShow] Movie ID:", movieId);

        const movie = await Movie.findById(movieId);

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found in database.",
            });
        }

        console.log(
            "[getShow] Cast count:",
            movie.casts?.length ?? 0
        );

        // Fetch cast when missing
        if (!movie.casts || movie.casts.length === 0) {
            if (!process.env.TMDB_ACCESS_TOKEN) {
                throw new Error(
                    "TMDB_ACCESS_TOKEN is missing in backend environment"
                );
            }

            const { data } = await axios.get(
                `https://api.themoviedb.org/3/movie/${encodeURIComponent(movieId)}/credits`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
                    },
                    timeout: 15000,
                }
            );

            movie.casts = data.cast || [];
            await movie.save();

            console.log(
                "[getShow] Cast saved:",
                movie.casts.length
            );
        }

        // Get upcoming show timings
        const shows = await Show.find({
            movie: movieId,
            showDateTime: {
                $gte: new Date(),
            },
        }).sort({
            showDateTime: 1,
        });

        const dateTime = {};

        for (const show of shows) {
            // Keep date formatting consistent with the stored date
            const date = show.showDateTime
                .toISOString()
                .split("T")[0];

            if (!dateTime[date]) {
                dateTime[date] = [];
            }

            dateTime[date].push({
                time: show.showDateTime,
                showId: show._id,
            });
        }

        return res.status(200).json({
            success: true,
            movie,
            dateTime,
        });

    } catch (error) {
        console.error("[getShow] Error:", error.message);
        console.error("[getShow] Code:", error.code || "N/A");

        if (error.response) {
            console.error(
                "[getShow] TMDB status:",
                error.response.status
            );
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

