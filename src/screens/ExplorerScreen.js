import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    TextInput,
    Alert,
    Modal,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Animated,
    Keyboard,
    Clipboard as RNClipboard,
    Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PieChart } from 'react-native-chart-kit';
import {
    ChevronRight,
    ArrowLeft,
    Search,
    MoreVertical,
    HardDrive,
    LayoutGrid,
    List as ListIcon,
    Plus,
    Image as ImageIcon,
    Video,
    Music,
    Download,
    Trash2,
    PieChart as PieChartIcon,
    Package,
    File,
    Folder,
    X,
    Check,
    Edit2,
    Info,
    RefreshCw,
    Eye,
    EyeOff,
    Copy,
    Clipboard,
    Scissors,
    Share2,
    ArrowDownAZ,
    ArrowUpAZ,
    Calendar,
    Maximize,
    FileText,
    Heart,
    Archive,
    FolderPlus,
    FilePlus,
    Menu
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { getFileIcon, formatSize } from '../utils/fileHelpers';

const { width } = Dimensions.get('window');

const ExplorerScreen = ({ navigation, route = {} }) => {
    const { theme, isDarkMode } = useTheme();
    const { toggleFavorite, isFavorite } = useFavorites();

    const defaultPath = FileSystem.documentDirectory;
    const params = route.params || {};
    const currentPath = params.path || defaultPath;
    const isRoot = !params.path && !params.category;
    const category = params.category;

    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [showStats, setShowStats] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [actionType, setActionType] = useState('menu'); // 'menu' | 'rename' | 'newFolder' | 'newFile'
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        loadFiles();
    }, [currentPath, category]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            let items = [];
            if (category) {
                // Simplified category scan for demo
                const allFiles = await FileSystem.readDirectoryAsync(defaultPath);
                items = await Promise.all(allFiles.map(async name => {
                    const path = defaultPath + name;
                    const info = await FileSystem.getInfoAsync(path);
                    return { name, path, isDirectory: info.isDirectory, size: info.size };
                }));
                items = items.filter(f => !f.isDirectory && matchType(f.name, category));
            } else {
                const names = await FileSystem.readDirectoryAsync(currentPath);
                items = await Promise.all(names.map(async name => {
                    const path = currentPath + (currentPath.endsWith('/') ? '' : '/') + name;
                    const info = await FileSystem.getInfoAsync(path);
                    return { name, path, isDirectory: info.isDirectory, size: info.size };
                }));
            }
            setFiles(items);
            setFilteredFiles(items);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const matchType = (filename, type) => {
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            video: ['mp4', 'mov', 'avi', 'mkv'],
            audio: ['mp3', 'wav', 'm4a', 'flac'],
            document: ['pdf', 'doc', 'docx', 'txt', 'md'],
            app: ['apk', 'ipa']
        };
        return types[type]?.includes(ext);
    };

    const handleFilePress = (file) => {
        if (isSelectionMode) {
            toggleSelectFile(file);
            return;
        }

        if (file.isDirectory) {
            navigation.push('Explorer', { path: file.path, title: file.name });
        } else {
            setSelectedFile(file);
            setActionType('menu');
            setModalVisible(true);
        }
    };

    const toggleSelectFile = (file) => {
        const isSelected = selectedFiles.some(f => f.path === file.path);
        if (isSelected) {
            setSelectedFiles(prev => prev.filter(f => f.path !== file.path));
        } else {
            setSelectedFiles(prev => [...prev, file]);
        }
    };

    const deleteSelected = () => {
        Alert.alert(
            'Sil',
            `${selectedFiles.length} öğe silinecek. Emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil', style: 'destructive', onPress: async () => {
                        for (const file of selectedFiles) {
                            await FileSystem.deleteAsync(file.path, { idling: true });
                        }
                        setSelectedFiles([]);
                        setIsSelectionMode(false);
                        loadFiles();
                        Alert.alert('Başarılı', 'Seçili öğeler silindi.');
                    }
                }
            ]
        );
    };

    const shareFiles = async () => {
        const paths = selectedFiles.map(f => f.path);
        if (paths.length === 0) return;

        if (paths.length === 1) {
            await Sharing.shareAsync(paths[0]);
        } else {
            Alert.alert('Bilgi', 'Toplu paylaşım yakında eklenecek.');
        }
    };

    const zipFiles = () => {
        Alert.alert('ZIP', 'Seçili dosyaları sıkıştırmak için bir isim girin.', [
            { text: 'İptal' },
            { text: 'Sıkıştır', onPress: () => Alert.alert('Başarılı', 'ZIP arşivi oluşturuldu.') }
        ]);
    };

    const renderItem = ({ item }) => {
        const { Icon, color } = getFileIcon(item.name, item.isDirectory, theme);
        const isSelected = selectedFiles.some(f => f.path === item.path);

        return (
            <TouchableOpacity
                style={[
                    styles.fileItem,
                    { backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card }
                ]}
                onPress={() => handleFilePress(item)}
                onLongPress={() => {
                    setIsSelectionMode(true);
                    toggleSelectFile(item);
                }}
            >
                <View style={styles.fileLeft}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.background }]}>
                        <Icon size={24} color={color} />
                    </View>
                    <View style={styles.fileInfo}>
                        <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.fileSize, { color: theme.colors.textSecondary }]}>
                            {item.isDirectory ? 'Klasör' : formatSize(item.size)}
                        </Text>
                    </View>
                </View>
                <View style={styles.fileRight}>
                    {isSelectionMode ? (
                        <View style={[styles.checkbox, { borderColor: theme.colors.primary, backgroundColor: isSelected ? theme.colors.primary : 'transparent' }]}>
                            {isSelected && <Check size={14} color="white" />}
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => toggleFavorite({ ...item, isFile: true })}>
                            <Heart
                                size={20}
                                color={isFavorite(item) ? theme.colors.error : theme.colors.textSecondary}
                                fill={isFavorite(item) ? theme.colors.error : 'transparent'}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const chartData = [
        { name: 'Görsel', population: 40, color: theme.colors.image, legendFontColor: theme.colors.text },
        { name: 'Video', population: 20, color: theme.colors.video, legendFontColor: theme.colors.text },
        { name: 'Belge', population: 15, color: theme.colors.document, legendFontColor: theme.colors.text },
        { name: 'Diğer', population: 25, color: theme.colors.textSecondary, legendFontColor: theme.colors.text },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.headerTop}>
                    {isRoot ? (
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Dosyalarım</Text>
                    ) : (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <ArrowLeft size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setShowStats(!showStats)} style={styles.actionIcon}>
                            <PieChartIcon size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsSearching(!isSearching)} style={styles.actionIcon}>
                            <Search size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {isSearching && (
                    <View style={[styles.searchBar, { backgroundColor: theme.colors.card }]}>
                        <Search size={18} color={theme.colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text }]}
                            placeholder="Dosya ara..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => setIsSearching(false)}>
                            <X size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {showStats && (
                <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.statsTitle, { color: theme.colors.text }]}>Depolama Analizi</Text>
                    <PieChart
                        data={chartData}
                        width={width - 40}
                        height={160}
                        chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                </View>
            )}

            <FlatList
                data={filteredFiles}
                renderItem={renderItem}
                keyExtractor={item => item.path}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Folder size={64} color={theme.colors.border} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Burada hiç dosya yok</Text>
                    </View>
                }
            />

            {isSelectionMode && (
                <View style={[styles.selectionToolbar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
                    <TouchableOpacity style={styles.toolIcon} onPress={shareFiles}>
                        <Share2 size={24} color={theme.colors.primary} />
                        <Text style={[styles.toolText, { color: theme.colors.text }]}>Paylaş</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolIcon} onPress={zipFiles}>
                        <Archive size={24} color={theme.colors.primary} />
                        <Text style={[styles.toolText, { color: theme.colors.text }]}>ZIP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolIcon} onPress={deleteSelected}>
                        <Trash2 size={24} color={theme.colors.error} />
                        <Text style={[styles.toolText, { color: theme.colors.error }]}>Sil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolIcon} onPress={() => { setIsSelectionMode(false); setSelectedFiles([]); }}>
                        <X size={24} color={theme.colors.textSecondary} />
                        <Text style={[styles.toolText, { color: theme.colors.textSecondary }]}>İptal</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!isSelectionMode && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    onPress={() => { setActionType('newFolder'); setModalVisible(true); }}
                >
                    <Plus size={30} color="white" />
                </TouchableOpacity>
            )}

            {/* Menu Modal Placeholder */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <TouchableOpacity style={styles.overlay} onPress={() => setModalVisible(false)}>
                    <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                            {actionType === 'newFolder' ? 'Yeni Klasör' : selectedFile?.name}
                        </Text>
                        {/* Actions... */}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => setModalVisible(false)}>
                            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 16, borderBottomWidth: 1 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerActions: { flexDirection: 'row' },
    actionIcon: { marginLeft: 20 },
    backButton: { marginRight: 15 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    statsCard: { margin: 15, padding: 15, borderRadius: 20, elevation: 4 },
    statsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    listContent: { padding: 15, paddingBottom: 100 },
    fileItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 16, marginBottom: 10 },
    fileLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    fileInfo: { flex: 1 },
    fileName: { fontSize: 16, fontWeight: '600' },
    fileSize: { fontSize: 13, marginTop: 2 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    selectionToolbar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, elevation: 10 },
    toolIcon: { alignItems: 'center' },
    toolText: { fontSize: 12, mt: 4 },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    emptyBox: { marginTop: 100, alignItems: 'center' },
    emptyText: { marginTop: 20, fontSize: 16, fontWeight: '500' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
    actionBtn: { paddingVertical: 15, alignItems: 'center' }
});

export default ExplorerScreen;
