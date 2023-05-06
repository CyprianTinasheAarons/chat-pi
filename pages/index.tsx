import { useRef, useState, useEffect } from 'react';
import Layout from '@/components/layout';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';


export default function Home() {
  //DID Video
  const talkVideo = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  //chat
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);

  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hi , how can I help?',
        type: 'apiMessage',
      },
    ],
    history: [],
  });
  const [newMessage, setNewMessage] = useState<{
    question: string;
    data: {
      text: string;
      sourceDocuments?: Document[];
    };
  } | null>(null);

  const { messages, history } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);


  const scrollToBottom = () => {
    //@ts-ignore
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest',

    });

  };


  //handle form submission
  async function handleSubmit(e: any) {
    e.preventDefault();

    setError(null);

    if (!query) {
      alert('Please input a question');
      return;
    }

    const question = query.trim();

    setMessageState((state) => ({
      ...state,
      messages: [
        ...state.messages,
        {
          type: 'userMessage',
          message: question,
        },
      ],
    }));

    scrollToBottom();

    setLoading(true);
    setQuery('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
        }),
      });
      const data = await response.json();


      if (data.error) {
        setError(data.error);
      } else {
        handleAudio(data.text);
        setNewMessage({
          question,
          data,
        });

      }

      //scroll to bottom
      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    } catch (error) {

      setError('An error occurred while fetching the data. Please try again.');
      console.log('error', error);
    }
  }

  //prevent empty submissions
  const handleEnter = (e: any) => {
    if (e.key === 'Enter' && query) {
      handleSubmit(e);
    } else if (e.key == 'Enter') {
      e.preventDefault();
    }
  };


  //Create audio 
  const handleAudio = async (text: string) => {
    try {
      await fetch('https://chat-pi.onrender.com/api/pi/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
        }),
      }).then(
        async (response) => {
          console.log(response);
          //@ts-ignore
          const data = await response.json();
          console.log(data)
          setAudioURL(data?.audioURL);
        }
      )

    } catch (error) {
      console.log('error', error);
    }
  }

  //Did Video 
  //Connect to rpc server
  let RTCPeerConnection: typeof window.RTCPeerConnection;

  if (typeof window !== 'undefined') {
    // @ts-ignore
    RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  }

  let sId: any;
  let sessionId: any;
  let sessionClientAnswer: any;

  const connect = async () => {
    if (peerConnection && peerConnection.connectionState === 'connected') {
      return;
    }

    stopAllStreams();
    closePC();

    const sessionResponse = await fetch(`${API_URL}/talks/streams`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_url: "https://res.cloudinary.com/dqzpz4w3l/image/upload/v1683232752/bushiri-transformed_znyzq1.png"
      }),
    });

    const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = await sessionResponse.json()
    setStreamId(newStreamId);
    sId = newStreamId;
    sessionId = newSessionId;



    try {
      sessionClientAnswer = await createPeerConnection(offer, iceServers);
      setConnected(true);
    } catch (e) {
      console.log('error during streaming setup', e);
      stopAllStreams();
      closePC();
      return;
    }

    const sdpResponse = await fetch(`${API_URL}/talks/streams/${sId}/sdp`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: sessionClientAnswer, session_id: sessionId })
      });
  }

  const createPeerConnection = async (offer: any, iceServers: any) => {
    let pc = new RTCPeerConnection({ iceServers });
    if (!peerConnection) {

      //@ts-ignore
      pc?.addEventListener('icecandidate', onIceCandidate, true);
      //@ts-ignore
      pc?.addEventListener('track', onTrack, true);

      setPeerConnection(pc);
    }

    await pc?.setRemoteDescription(offer);
    console.log('set remote sdp OK');

    const sessionClientAnswer = await pc?.createAnswer();
    console.log('create local sdp OK');

    await pc?.setLocalDescription(sessionClientAnswer);
    console.log('set local sdp OK');

    console.log('peer connection OK', sessionClientAnswer)

    return sessionClientAnswer;

  }

  const talk = async () => {

    console.log("Peer Connection", peerConnection); // Add this line to debug
    if (!peerConnection) {
      console.log("Peer Connection is undefined");
      return;
    }

    if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
      try {
        await fetch(
          `${API_URL}/talks/streams/${streamId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              script: {
                type: "audio",
                audio_url:
                  audioURL,
              },
              driver_url: "bank://lively/",
              config: {
                stitch: true,
              },
              session_id: sessionId,
            }),
          }
        )
      } catch (e) {
        console.log("error during talk", e);
        stopAllStreams();
        closePC();
        return;
      }


    }
  }

  const onIceCandidate = (event: any) => {
    console.log('onIceCandidate', event);
    if (event.candidate) {
      const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

      fetch(`${API_URL}/talks/streams/${sId}/ice`,
        {
          method: 'POST',
          headers: { Authorization: `Basic ${API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate, sdpMid, sdpMLineIndex, session_id: sessionId })
        });
    }
  }


  const onTrack = (event: any) => {
    const remoteStream = event.streams[0];
    setVideoElement(remoteStream);
  }

  const setVideoElement = (stream: any) => {
    if (!stream || !talkVideo || !talkVideo.current) return;

    talkVideo.current.srcObject = stream;

    // safari hotfix

    if (talkVideo.current.paused) {

      talkVideo.current.play().then(_ => { }).catch(e => { });
    }
  }

  const stopAllStreams = () => {
    if (!talkVideo || !talkVideo.current) return;
    if (talkVideo.current.srcObject) {
      console.log('stopping video streams');
      //@ts-ignore
      talkVideo.current.srcObject.getTracks().forEach(track => track.stop());

      talkVideo.current.srcObject = null;
    }
  }

  const closePC = () => {
    if (!peerConnection) return;
    console.log('stopping peer connection');
    peerConnection.close();
    peerConnection.removeEventListener('icecandidate', onIceCandidate, true);
    console.log('stopped peer connection');
    if (peerConnection === peerConnection) {
      setPeerConnection(null);
    }
  }


  useEffect(() => {
    if (audioURL) {
      setLoading(false);
      //scroll to bottom
      scrollToBottom();
      //playAudio
      const audio = new Audio(audioURL);
      //@ts-ignore
      setMessageState((state) => ({
        ...state,
        messages: [
          ...state.messages,
          {
            type: 'apiMessage',
            message: newMessage?.data.text,
            sourceDocs: newMessage?.data.sourceDocuments,
          },
        ],
        history: [...state.history, [newMessage?.question, newMessage?.data.text]],
      }));
      audio.play();
      setAudioURL(null);

    }
  }, [audioURL]);

  useEffect(() => {
    scrollToBottom();
  }, [messageState.messages]);

  return (
    <>
      <Layout>

        <div className="flex flex-col mx-auto ">
          <div className='flex justify-center m-4 bg-gradient-to-b from-transparent via-white to-white'>
            <div className='sticky '>
              <div className="relative group">
                <div className="absolute transition duration-1000 rounded-full opacity-25 -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 blur group-hover:opacity-50 group-hover:duration-200"></div>
                <div className='relative  z-10 sm:w-64 sm:h-64 w-52 h-52 bg-gray-100 rounded-full'>
                  <video
                    className='absolute object-cover sm:w-64 sm:h-64 w-52 h-52 rounded-full z-12' autoPlay
                    playsInline

                    loop
                    src="./bur.mp4"
                  ></video>
                </div>
              </div>
  
            </div>
          </div>


          <main className={styles.main}>
            <div className={styles.cloud}>
              <div ref={messageListRef} className={styles.messagelist}>
                {messages.map((message, index) => {
                  let className;
                  return (
                    <>
                      <div key={`chatMessage-${index}`} className={className}>

                        <div className={styles.markdownanswer}>
                          {message.type === 'apiMessage' && (
                            <div className="my-2 text-left place-self-start" >
                              <ReactMarkdown className='p-5 sm:text-xl text-sm font-light rounded-tl-none ' linkTarget="_blank">
                                {message.message}
                              </ReactMarkdown>
                            </div>
                          )}
                          {message.type === 'userMessage' && (
                            <div className="my-2 text-right place-self-start">
                              <ReactMarkdown className='p-5 sm:text-xl text-sm font-light text-purple-500 rounded-tr-none rounded-2xl' linkTarget="_blank">
                                {message.message}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>

                    </>
                  );
                })}
              </div>
              <div ref={messagesEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 w-full pt-1 border-transparent bg-gradient-to-b from-transparent via-white to-white  md:pt-2">
          
              <div className={styles.center}>
                <div className={styles.cloudform}>

                  <form onSubmit={handleSubmit}>
                    <textarea
                      disabled={loading}
                      onKeyDown={handleEnter}
                      ref={textAreaRef}
                      autoFocus={false}
                      rows={1}
                      maxLength={512}
                      id="userInput"
                      name="userInput"
                      placeholder={
                        loading
                          ? 'Waiting for response...'
                          : 'Hi there, how can I help?'
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className={styles.textarea}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className={styles.generatebutton}
                    >
                      {loading ? (
                        <div className={styles.loadingwheel}>
                          <LoadingDots color="#000" />
                        </div>
                      ) : (
                        // Send icon SVG in input field
                        <svg
                          viewBox="0 0 20 20"
                          className={styles.svgicon}
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                        </svg>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </main>
        </div>

      </Layout>
    </>
  );
}
