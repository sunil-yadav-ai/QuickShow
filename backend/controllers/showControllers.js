import axios from "axios";
import movie from "../models/movie.js";




export const getNowPlayingMovies = async (req,res)=>{

    try{


       const {data} =  await axios.get('https://api.themoviedb.org/3/movie/now_playing',{
            headers:{Authorization:`Bearer ${process.env.TMDB_ACCESS_TOKEN}`}
        })

        const movies = data.results;
        res.json({success:true,movies:movies})


    }catch(e){
        console.error(e)
        res.json({success:false,message:e.message})

    }

}


//api to add a new show to the database

export const addShow = async (req,res)=>{
    try{

        const { movie_id,showInput,showPrice} = req.body
        let movie = await movie.findById(movie_id)
        if(!movie){
            //
            const [movieDetailsResponse,movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movie_id}`,{
                    headers:{Authorization:`Bearer ${process.env.TMDB_ACCESS_TOKEN}`}
        }), 
                axios.get(`https://api.themoviedb.org/3/movie/${movie_id}/credits`,{
                    headers:{Authorization:`Bearer ${process.env.TMDB_ACCESS_TOKEN}`}

                })
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                _id:movie_id,
                title:movieApiData.title,
                overview:movieApiData.overview,
                poster_path:movieApiData.poster_path,
                backdrop_path:movieApiData.backdrop_path,
                genres:movieApiData.genres,
                casts:movieCreditsData.casts,
                release_date:movieApiData.release_date,
                original_language:movieApiData.original_language,
                tagline:movieApiData.tagline || "",
                vote_average:movieApiData.vote_average,
                runtime:movieApiData.runtime,
            }

            movie = await movie.create(movieDetails);
        }

    }catch(e){
        console.error(error);
        res.json({successz:false,message:e.message})
    }
}