import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Dimensions,
    Alert,
    Modal,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import { Video } from 'expo-av';
import {
    Folder,
    Image as ImageIconLucide,
    Trash2,
    RotateCw,
    Crop,
    ArrowLeft,
    MoreVertical,
    Grid3x3,
    List as ListIcon,
    Play,
    Share2,
    Maximize2
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const IMAGE_SIZE = (width - 12) / COLUMN_COUNT;

const GalleryScreen = ({ navigation }) => {
    const { theme, isDarkMode } = useTheme();

    const [albums, setAlbums] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('albums'); // 'albums' | 'photos'
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [fullscreenVisible, setFullscreenVisible] = useState(false);

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status === 'granted') {
            loadAlbums();
        } else {
            Alert.alert('İzin Gerekli', 'Galeriye erişim için izin vermeniz gerekiyor.');
        }
    };

    const loadAlbums = async () => {
        try {
            setLoading(true);
            const albumsData = await MediaLibrary.getAlbumsAsync();
            const albumsWithCount = await Promise.all(
                albumsData.map(async (album) => {
                    const assetsRes = await MediaLibrary.getAssetsAsync({
                        album: album.id,
                        first: 1
                    });
                    return {
                        ...album,
                        assetCount: album.assetCount || 0,
                        thumbnail: assetsRes.assets[0]?.uri || null
                    };
                })
            );
            setAlbums(albumsWithCount.sort((a, b) => b.assetCount - a.assetCount));
        } catch (error) {
            console.error('Album load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAssets = async (albumId) => {
        try {
            setLoading(true);
            const assetsRes = await MediaLibrary.getAssetsAsync({
                album: albumId,
                first: 100,
                sortBy: ['creationTime'],
                mediaType: ['photo', 'video']
            });
            setAssets(assetsRes.assets);
        } catch (error) {
            console.error('Assets load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAlbum = (album) => {
        setSelectedAlbum(album);
        setViewMode('photos');
        loadAssets(album.id);
    };

    const goBackToAlbums = () => {
        setViewMode('albums');
        setSelectedAlbum(null);
        setAssets([]);
    };

    const handleAssetPress = (asset) => {
        setSelectedAsset(asset);
        setFullscreenVisible(true);
    };

    const handleAssetLongPress = (asset) => {
        setSelectedAsset(asset);
        setModalVisible(true);
    };

    const rotatePhoto = async () => {
        if (!selectedAsset || selectedAsset.mediaType !== 'photo') return;
        try {
            const result = await ImageManipulator.manipulateAsync(
                selectedAsset.uri,
                [{ rotate: 90 }],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            updateAssetUri(selectedAsset.id, result.uri);
            Alert.alert('Başarılı', 'Fotoğraf döndürüldü.');
            setModalVisible(false);
        } catch (e) {
            Alert.alert('Hata', 'Fotoğraf düzenlenemedi.');
        }
    };

    const cropPhoto = async () => {
        if (!selectedAsset || selectedAsset.mediaType !== 'photo') return;
        try {
            const result = await ImageManipulator.manipulateAsync(
                selectedAsset.uri,
                [{ crop: { originX: 0, originY: 0, width: 500, height: 500 } }],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            updateAssetUri(selectedAsset.id, result.uri);
            Alert.alert('Başarılı', 'Fotoğraf kırpıldı (500x500).');
            setModalVisible(false);
        } catch (e) {
            Alert.alert('Hata', 'Fotoğraf düzenlenemedi.');
        }
    };

    const updateAssetUri = (id, newUri) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, uri: newUri } : a));
        if (selectedAsset && selectedAsset.id === id) {
            setSelectedAsset(prev => ({ ...prev, uri: newUri }));
        }
    };

    const deleteAsset = async () => {
        try {
            await MediaLibrary.deleteAssetsAsync([selectedAsset.id]);
            setAssets(prev => prev.filter(a => a.id !== selectedAsset.id));
            setModalVisible(false);
            setFullscreenVisible(false);
            Alert.alert('Başarılı', 'Öğe silindi.');
        } catch (error) {
            Alert.alert('Hata', 'Silme işlemi başarısız.');
        }
    };

    const renderAlbumItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.albumCard, { backgroundColor: theme?.colors?.card || '#ffffff' }]}
            onPress={() => openAlbum(item)}
        >
            {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.albumThumbnail} />
            ) : (
                <View style={[styles.albumThumbnail, { backgroundColor: theme?.colors?.background || '#f8fafc', justifyContent: 'center', alignItems: 'center' }]}>
                    <Folder size={40} color={theme?.colors?.textSecondary || '#64748b'} />
                </View>
            )}
            <View style={styles.albumInfo}>
                <Text style={[styles.albumTitle, { color: theme?.colors?.text || '#1e293b' }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.albumCount, { color: theme?.colors?.textSecondary || '#64748b' }]}>{item.assetCount} öğe</Text>
            </View>
        </TouchableOpacity>
    );

    const renderAssetItem = ({ item }) => (
        <TouchableOpacity
            style={styles.assetItem}
            onPress={() => handleAssetPress(item)}
            onLongPress={() => handleAssetLongPress(item)}
        >
            <Image source={{ uri: item.uri }} style={styles.assetImage} />
            {item.mediaType === 'video' && (
                <View style={styles.videoIndicator}>
                    <Play size={16} color="white" fill="white" />
                </View>
            )}
        </TouchableOpacity>
    );

    if (!hasPermission) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8fafc' }]}>
                <View style={styles.permissionContainer}>
                    <ImageIconLucide size={64} color={theme?.colors?.textSecondary || '#64748b'} />
                    <Text style={[styles.permissionText, { color: theme?.colors?.textSecondary || '#64748b' }]}>Galeriye erişim izni gerekli</Text>
                    <TouchableOpacity style={[styles.permissionButton, { backgroundColor: theme?.colors?.primary || '#6366f1' }]} onPress={requestPermissions}>
                        <Text style={styles.permissionButtonText}>İzin Ver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8fafc' }]} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme?.colors?.border || '#e2e8f0' }]}>
                <View style={styles.headerLeft}>
                    {viewMode === 'photos' && (
                        <TouchableOpacity onPress={goBackToAlbums} style={styles.backButton}>
                            <ArrowLeft color={theme?.colors?.text || '#1e293b'} size={24} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.headerTitle, { color: theme?.colors?.text || '#1e293b' }]}>
                        {viewMode === 'albums' ? 'Albümler' : selectedAlbum?.title}
                    </Text>
                </View>
                {viewMode === 'photos' && (
                    <Text style={[styles.photoCount, { color: theme?.colors?.textSecondary || '#64748b' }]}>{assets.length} öğe</Text>
                )}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme?.colors?.primary || '#6366f1'} />
                </View>
            ) : viewMode === 'albums' ? (
                <FlatList
                    data={albums}
                    renderItem={renderAlbumItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={<Text style={styles.emptyText}>Albüm bulunamadı</Text>}
                />
            ) : (
                <FlatList
                    data={assets}
                    renderItem={renderAssetItem}
                    keyExtractor={item => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.assetList}
                />
            )}

            {/* Fullscreen View */}
            <Modal visible={fullscreenVisible} transparent={true} animationType="fade">
                <View style={styles.fullscreenContainer}>
                    <View style={styles.fullscreenHeader}>
                        <TouchableOpacity onPress={() => setFullscreenVisible(false)}>
                            <ArrowLeft color="white" size={28} />
                        </TouchableOpacity>
                        <View style={styles.fullscreenHeaderRight}>
                            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.fullscreenIcon}>
                                <MoreVertical color="white" size={24} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {selectedAsset?.mediaType === 'video' ? (
                        <Video
                            source={{ uri: selectedAsset.uri }}
                            rate={1.0}
                            volume={1.0}
                            isMuted={false}
                            resizeMode="contain"
                            shouldPlay
                            useNativeControls
                            style={styles.fullscreenContent}
                        />
                    ) : (
                        <Image source={{ uri: selectedAsset?.uri }} style={styles.fullscreenContent} resizeMode="contain" />
                    )}
                </View>
            </Modal>

            {/* Menu Modal */}
            <Modal transparent={true} visible={modalVisible} animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: theme?.colors?.card || '#ffffff' }]}>
                        <Text style={[styles.modalTitle, { color: theme?.colors?.text || '#1e293b' }]}>İşlemler</Text>

                        {selectedAsset?.mediaType === 'photo' && (
                            <>
                                <TouchableOpacity style={styles.actionRow} onPress={rotatePhoto}>
                                    <RotateCw size={20} color={theme?.colors?.primary || '#6366f1'} />
                                    <Text style={[styles.actionText, { color: theme?.colors?.text || '#1e293b' }]}>90° Döndür</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionRow} onPress={cropPhoto}>
                                    <Crop size={20} color={theme?.colors?.primary || '#6366f1'} />
                                    <Text style={[styles.actionText, { color: theme?.colors?.text || '#1e293b' }]}>Kırp (500x500)</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity style={styles.actionRow} onPress={deleteAsset}>
                            <Trash2 size={20} color={theme?.colors?.error || '#ef4444'} />
                            <Text style={[styles.actionText, { color: theme?.colors?.error || '#ef4444' }]}>Sil</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    backButton: { marginRight: 15 },
    photoCount: { fontSize: 14, fontWeight: '600' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listPadding: { padding: 8 },
    albumCard: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    albumThumbnail: { width: '100%', height: 160 },
    albumInfo: { padding: 12 },
    albumTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    albumCount: { fontSize: 12 },
    assetList: { padding: 4 },
    assetItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, margin: 2 },
    assetImage: { width: '100%', height: '100%', borderRadius: 8 },
    videoIndicator: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 4 },
    fullscreenContainer: { flex: 1, backgroundColor: 'black' },
    fullscreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
    fullscreenHeaderRight: { flexDirection: 'row' },
    fullscreenIcon: { marginLeft: 20 },
    fullscreenContent: { flex: 1, width: '100%', height: '100%' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    actionText: { fontSize: 16, fontWeight: '600', marginLeft: 15 },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    permissionText: { fontSize: 16, marginVertical: 20, textAlign: 'center' },
    permissionButton: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
    permissionButtonText: { color: 'white', fontWeight: '700' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 }
});

export default GalleryScreen;
