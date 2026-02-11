import { File, Folder, Image, Video, Music, FileText, FileQuestion } from 'lucide-react-native';
import { theme } from '../theme/theme';

export const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (name, isDirectory) => {
    if (isDirectory) return { Icon: Folder, color: theme.colors.folder };

    const ext = name.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return { Icon: Image, color: theme.colors.image };
    }
    if (['mp4', 'mkv', 'mov', 'avi'].includes(ext)) {
        return { Icon: Video, color: theme.colors.video };
    }
    if (['mp3', 'wav', 'm4a', 'flac'].includes(ext)) {
        return { Icon: Music, color: theme.colors.audio };
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
        return { Icon: FileText, color: theme.colors.document };
    }

    return { Icon: File, color: theme.colors.textSecondary };
};

export const getFileExtension = (name) => {
    return name.split('.').pop().toUpperCase();
};
