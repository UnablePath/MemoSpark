import type React from 'react';

const CrashoutTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4 text-white">
      <div className="bg-white/20 backdrop-blur-lg rounded-xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Crash Out Here, Not His Inbox ✨
        </h1>
        
        <div className="my-8">
          {/* Placeholder for the image. Replace with actual image path */}
          <img 
            src="/placeholder-crashout-image.png" 
            alt="Stress relief illustration" 
            className="mx-auto w-48 h-48 object-contain rounded-lg shadow-md"
          />
        </div>

        <p className="text-lg md:text-xl mb-8">
          This is a safe space to feel, vent, and let go.
          Wanna curse him out? Write it here instead.
          Everything you type is anonymous. Nothing is saved—except your dignity.
        </p>

        <button 
          onClick={() => alert("Feature under development. Stay tuned!")}
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
        >
          Crash In ✨
        </button>

        <p className="mt-10 text-sm text-white/80">
          (This feature is currently under development)
        </p>
      </div>
    </div>
  );
};

export default CrashoutTab; 