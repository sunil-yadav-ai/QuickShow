import axios from "axios";
import Movie from "../models/movie.js";
import Show from "../models/show.js";
import show from "../models/show.js";

// API to get now playing movies
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

        const movies = data.results;

        res.json({
            success: true,
            movies: movies,
        });

    } catch (e) {
        console.error(e);

        res.json({
            success: false,
            message: e.message,
        });
    }
};


// API to add a new show to the database
export const addShow = async (req, res) => {
    try {
        const { movie_id, showInput, showPrice } = req.body;

        // Find movie in database
        let movie = await Movie.findById(movie_id);

        // If movie does not exist, fetch it from TMDB
        if (!movie) {

            const [movieDetailsResponse, movieCreditsResponse] =
                await Promise.all([
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

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                _id: movie_id,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres,
                casts: movieCreditsData.casts,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
            };

            movie = await Movie.create(movieDetails);
        }

        // Create shows
        const showsToCreate = [];

        showInput.forEach((show) => {

            const showDate = show.date;

            show.time.forEach((time) => {

                const dateTimeString = `${showDate}T${time}`;

                showsToCreate.push({
                    movie: movie_id,
                    showDateTime: new Date(dateTimeString),
                    showPrice: showPrice,
                    occupiedSeats: {},
                });
            });
        });

        // Insert shows into database
        if (showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
        }

        res.json({
            success: true,
            message: "Show Added successfully.",
        });

    } catch (e) {
        console.error(e);

        res.json({
            success: false,
            message: e.message,
        });
    }
};



// api to get all shows from the database

export const getShows = async (req,res) =>{
    try{
        const shows = await Show.find({showDateTime:{$gte:new Date()}}).populate('movie').sort({showDateTime:1});

        //filter unique shows
        const uniqueShows = new Set(shows.map(show => show.movie))

        res.json({success:true,shows:Array.from(uniqueShows)})

    }
    catch(e){
        console.error(e);
        res.json({success:false,message:e.message});

    }
}

export const getShow = async (req,res)=>{
    try{
        const {movieId} = req.params;
        const shows = await Show.find({movie:movieId,showDateTime:{$gte:new Date()}})

        const movie = await Movie.findById(movieId);
        const dateTime = {};

        shows.forEach((show)=>{
            const date = show.showDateTime.toISOString().split('T')[0];
            if(!dateTime[date]){
                dateTime[date] = []
            }
            dateTime[date].push({time:show.showDateTime,showId:show._id})
        })
        res.json({success:true,movie,dateTime})

    }catch(e){
        console.error(e);
        res.json({success:false,message:e.message});

    }

}