import { useRef, useState, useEffect } from 'react';
import Layout from '@/components/layout';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hi there, how can I help?',
        type: 'apiMessage',
      },
    ],
    history: [],
  });

  const { messages, history } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

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
      console.log('data', data);

      if (data.error) {
        setError(data.error);
      } else {
        setMessageState((state) => ({
          ...state,
          messages: [
            ...state.messages,
            {
              type: 'apiMessage',
              message: data.text,
              sourceDocs: data.sourceDocuments,
            },
          ],
          history: [...state.history, [question, data.text]],
        }));
      }
      console.log('messageState', messageState);

      setLoading(false);

      //scroll to bottom
      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    } catch (error) {
      setLoading(false);
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

  const handleConnect = async (event: any) => {
    event.preventDefault();
    try {
      await fetch('/api/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: ""
      });

    }
    catch (error) {
      console.log('error', error);
    }
    
  };

  const handleTalk = async (event: any) => {
    event.preventDefault();
    try {
      await fetch('/api/stream', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: ""
      });

    } catch (error) {
      console.log('error', error);
    }
  };
 
  return (
    <>
      <Layout>
        <div className="flex flex-col mx-auto ">
          <div className='flex justify-center m-4'>
            <div className='relative isolate'>
              <div className="relative group">
                <div className="absolute transition duration-1000 rounded-full opacity-25 -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 blur group-hover:opacity-50 group-hover:duration-200"></div>
                <div className='relative z-10 w-64 h-64 bg-gray-100 rounded-full'>
                  <video className='absolute object-cover w-64 h-64 rounded-full z-12' autoPlay loop muted src='/bur.mp4'></video>
                  <video id="talk-video" className='absolute object-cover w-64 h-64 rounded-full z-16' autoPlay ></video>
                </div>
              </div>

            </div>
          </div>

          <div>
            <button onClick={handleConnect} className='px-4 py-2 m-2 text-white bg-purple-500 rounded-md'>Connect</button>
            <button onClick={handleTalk} className='px-4 py-2 m-2 text-white bg-purple-500 rounded-md'>Talk</button>
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
                            <div className="my-2 text-left place-self-start">
                              <ReactMarkdown className='p-5 text-sm rounded-tl-none bg-gray-50 rounded-2xl' linkTarget="_blank">
                                {message.message}
                              </ReactMarkdown>
                            </div>
                          )}
                          {message.type === 'userMessage' && (
                            <div className="my-2 text-right place-self-start">
                              <ReactMarkdown className='p-5 text-sm text-white bg-purple-500 rounded-tr-none rounded-2xl' linkTarget="_blank">
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
            </div>
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
            {error && (
              <div className="p-4 border border-red-400 rounded-md">
                <p className="text-red-500">{error}</p>
              </div>
            )}
          </main>
        </div>

      </Layout>
    </>
  );
}
