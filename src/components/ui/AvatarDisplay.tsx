
import { useMemo } from 'react';

interface AvatarDisplayProps {
    seed: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function AvatarDisplay({ seed, className = "", size = 'md' }: AvatarDisplayProps) {
    const isEmoji = useMemo(() => {
        // Basic check if the string is just an emoji (short length)
        // Most single emojis are 2 chars (surrogate pairs), some are more.
        // Seeds for avatars will likely be longer (names like "Felix", "Bandit", etc.)
        return seed && seed.length <= 4 && /\p{Emoji}/u.test(seed);
    }, [seed]);

    const sizeClasses = {
        sm: "w-8 h-8 text-lg",
        md: "w-12 h-12 text-2xl",
        lg: "w-16 h-16 text-3xl",
        xl: "w-24 h-24 text-5xl",
        '2xl': "w-32 h-32 text-7xl",
    };

    if (isEmoji) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 rounded-full ${sizeClasses[size]} ${className}`}>
                {seed}
            </div>
        );
    }

    // Use DiceBear Notion style or Bottts or Fun Emoji
    // 'notionists' and 'avataaars' are good. Let's use 'notionists' for a sketchy fun look, or 'bottts' for robots.
    // User said "avatars more", let's use 'adventurer' or 'fun-emoji'.
    // 'adventurer' is very expressive.
    // User requested "carton" and "colorful" avatars. 'adventurer' is perfect.
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;

    return (
        <div className={`overflow-hidden rounded-full bg-white border-2 border-black/5 ${sizeClasses[size].split(' ')[0]} ${sizeClasses[size].split(' ')[1]} ${className}`}>
            <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
            />
        </div>
    );
}
