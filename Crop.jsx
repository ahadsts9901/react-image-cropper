import React, { useEffect, useRef, useState } from 'react'
import "./Home.css"
import { Plus, Save } from 'react-bootstrap-icons'
import Cropper from 'react-easy-crop'
import { getTiles } from '../../../firebase.mjs'
import axios from 'axios'
import "animate.css/animate.min.css";

const Home = () => {

    const [tileImages, setTileImages] = useState([])
    const [displayImage, setDisplayImage] = useState(null)
    const [icon, setIcon] = useState(<Plus style={{ fontSize: "4em" }} />)
    const [roomImage, setRoomImage] = useState(null)
    const [message, setMessage] = useState("")
    const [isCropping, setIsCropping] = useState(false)
    const [showButton, setShowButton] = useState(false)
    const [croppingImage, setCroppingImage] = useState(null)
    const [userImage, setUserImage] = useState(null)
    const [croppedImage, setCroppedImage] = useState(null)
    const [uploadImageInstruction, setUploadImageInstruction] = useState("Upload your room image")
    const [showNewImage, setShowNewImage] = useState(false)
    const [showOldImage, setShowOldImage] = useState(true)

    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)

    const fileRef = useRef()
    const tileRef = useRef()
    const imageAnimate = useRef()

    const baseUrl = "http://localhost:5000"

    useEffect(() => {
        setShowOldImage(true)
        setShowNewImage(false)
        setTimeout(() => {
            setShowOldImage(false)
            setShowNewImage(true)
        }, 2000)
    }, [displayImage])

    const onCropComplete = async (croppedArea, croppedAreaPixels) => {
        setUploadImageInstruction("")
        try {
            const croppedImageBlob = await getCroppedImg(userImage, croppedAreaPixels);
            setCroppedImage(URL.createObjectURL(croppedImageBlob));
        } catch (error) {
            console.error('Error cropping image:', error);
        }
    };

    const getCroppedImg = async (image, croppedAreaPixels) => {

        setUploadImageInstruction("")
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const imageBitmap = await createImageBitmap(image);
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx.drawImage(
            imageBitmap,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            croppedAreaPixels.width,
            croppedAreaPixels.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Error creating cropped image blob'));
                }
            }, 'image/jpeg'); // You can change the format if needed
        });
    };

    useEffect(() => {
        const fetchTiles = async () => {
            try {
                const fileUrls = await getTiles("tiles");
                // console.log(fileUrls);
                setTileImages([...fileUrls]);
            } catch (error) {
                console.error('Error listing files:', error);
            }
        };

        fetchTiles();

    }, []);

    const uploadImage = async () => {

        setUploadImageInstruction("")
        setIsCropping(false)
        setDisplayImage(null);
        setIcon(<span id='loader'></span>);

        if (!croppedImage) {
            setMessage('Please crop the image');
            setTimeout(() => {
                setMessage('');
            }, 1200);
            setIcon(<Plus style={{ fontSize: '4em' }} />);
            return;
        }

        uploadImageToFirebase(croppedImage)

    };

    const uploadImageToFirebase = async (imageUrl) => {
        setUploadImageInstruction("")
        try {
            const { data: imageBlob } = await axios.get(imageUrl, { responseType: 'blob' });

            const storageRef = firebase.storage().ref();

            const filename = `room-images/${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;

            const snapshot = await storageRef.child(filename).put(imageBlob);

            const downloadURL = await snapshot.ref.getDownloadURL();

            setDisplayImage(downloadURL);
            setRoomImage(downloadURL);
            setIsCropping(false);


            return downloadURL;
        } catch (error) {
            console.error('Error uploading image to Firebase Storage:', error.message);
            throw error;
        }
    };

    const sendImages = async (e) => {
        setUploadImageInstruction("")
        const tileImg = e.target.src
        const roomImg = roomImage

        // console.log({
        //     "tileImage": tileImg,
        //     "roomImage": roomImg,
        // });

        if (!tileImg) {
            setMessage("Please select a tile")

            setTimeout(() => {
                setMessage("")
            }, [1200])

            return;
        }

        if (!roomImg) {
            setMessage("Please provide room image")

            setTimeout(() => {
                setMessage("")
            }, [1200])

            return;
        }

        setDisplayImage(null)
        setIcon(<span id='loader'></span>)

        try {
            const response = await axios.post(`${baseUrl}/api/v1/apply-tiles`, {
                tileImage: tileImg,
                roomImage: roomImg
            })

            // console.log(response.data.image);
            setShowButton(true)
            setDisplayImage(response.data.image)

        } catch (error) {
            console.log(error);
        }

    }

    const downloadImage = () => {

        setUploadImageInstruction("")
        var element = document.createElement("a");
        var file = new Blob([displayImage], { type: "image/*" });
        element.href = URL.createObjectURL(file);
        element.download = `see-or-show-placed-tile-${new Date().getTime()}`;
        element.click();

    }

    const cropImage = (e) => {
        setUploadImageInstruction("")
        if (e.target.files[0]) {
            setIsCropping(true)
            setUserImage(e.target.files[0])
            setCroppingImage(URL.createObjectURL(e.target.files[0]))
        } else {
            setIsCropping(false)
        }

    }

    return (
        <>
            {
                isCropping ?
                    <div className="mainCropper">
                        <div className="cropCont">
                            <div className='cropperCont'>
                                <Cropper
                                    image={croppingImage}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={3 / 2}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className='cropControls'>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => {
                                        setZoom(e.target.value)
                                    }}
                                    className="zoom-range"
                                />
                                <button className='cropBtn' onClick={uploadImage}>Select</button>
                            </div>
                        </div>
                    </div>
                    : null
            }
            <div className="homeMain">
                <div className="tileImages">
                    {
                        tileImages ? tileImages.map((image, index) => (
                            <div className={`tileImage ${displayImage ? "enabledTiles" : "disabledTiles"}`} key={index}>
                                <img className={`tileImage ${displayImage ? "enabledTiles" : "disabledTiles"}`} onClick={(e) => sendImages(e)} src={image} alt="tile" ref={tileRef} />
                            </div>
                        )) : null
                    }
                </div>
                <div className="section">
                    {
                        showButton ? <button className='downloadBtnDesktop' onClick={downloadImage}>
                            <Save /> Download
                        </button> : null
                    }
                    <label htmlFor="file">
                        {
                            showNewImage ?
                                <img src={displayImage} alt="image" className='displayImage' style={{ display: `${displayImage ? "block" : "none"}` }} />
                                :
                                <img src={roomImage} alt="image" className='displayImage' style={{ display: `${displayImage ? "block" : "none"}` }} />
                        }
                    </label>
                    <label htmlFor='file' className='displayImagecont' ref={imageAnimate}
                        style={{
                            display: `${displayImage ? "none" : "flex"}`,
                            backgroundImage: `url(${croppedImage})`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "cover",
                        }}
                    >
                        {icon}
                        {
                            !displayImage ? <p>{uploadImageInstruction}</p> : null
                        }
                    </label>
                    <p className='message' style={{ display: `${message ? "block" : "none"}` }}>{message}</p>
                    {
                        showButton ? <button className='downloadBtnMobile' onClick={downloadImage}>
                            <Save /> Download
                        </button> : null
                    }
                </div>
            </div>
            <input type="file" accept='image/*' ref={fileRef} hidden id='file' onChange={(e) => cropImage(e)} />
        </>
    )
}

export default Home