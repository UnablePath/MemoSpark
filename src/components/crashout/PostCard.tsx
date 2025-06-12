'use client';

import React from 'react';

const moodOptions: any = {
  stressed: { bg: 'bg-red-500/80', border: 'border-red-400', emoji: '😤', label: 'STRESSED AF' },
  overwhelmed: { bg: 'bg-purple-500/80', border: 'border-purple-400', emoji: '😵‍💫', label: 'OVERWHELMED' },
  frustrated: { bg: 'bg-orange-500/80', border: 'border-orange-400', emoji: '🤬', label: 'FRUSTRATED' },
  anxious: { bg: 'bg-yellow-500/80', border: 'border-yellow-400', emoji: '😬', label: 'ANXIOUS' },
  sad: { bg: 'bg-blue-500/80', border: 'border-blue-400', emoji: '😢', label: 'SAD' },
};


export const PostCard = ({ post, onReaction }: any) => {
  const moodStyle = moodOptions[post.mood] || moodOptions.stressed;

  return (
    <div className={`backdrop-blur-md rounded-2xl p-6 shadow-xl border-l-8 ${moodStyle.border} ${moodStyle.bg}
                     transform hover:scale-[1.02] transition-all duration-200`}>
      <div className="flex items-start space-x-4">
        <div className={`w-14 h-14 ${moodStyle.bg} rounded-full flex items-center justify-center text-3xl shadow-inner`}>
          {moodStyle.emoji}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg text-white">
              {post.isAnonymous ? 'Anonymous Crasher' : post.author}
            </span>
            <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-bold text-white/80">
              {moodStyle.label}
            </span>
          </div>
          
          <p className="text-lg text-white/90 leading-relaxed mb-4">{post.content}</p>
          
          <div className="flex space-x-3 pt-2">
            {['🔥', '💯', '😤', '❤️', '🫂'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => onReaction(post.id, emoji)}
                className="bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full 
                         text-lg font-bold transition-all duration-150 text-white/80
                         hover:scale-110 hover:text-white active:scale-95"
              >
                {emoji} {post.reactions[emoji] || 0}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 