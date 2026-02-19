import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Plus,
    Search,
    Trash2,
    FileText,
    ChevronRight,
    X,
    Save,
    ArrowLeft,
    Clock
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const NotesScreen = () => {
    const { theme, isDarkMode } = useTheme();
    const [notes, setNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        try {
            const savedNotes = await AsyncStorage.getItem('user-notes');
            if (savedNotes) {
                setNotes(JSON.parse(savedNotes).sort((a, b) => b.updatedAt - a.updatedAt));
            }
        } catch (error) {
            console.error('Notes load error:', error);
        }
    };

    const saveNote = async () => {
        if (!noteTitle.trim() && !noteContent.trim()) {
            setModalVisible(false);
            return;
        }

        try {
            let newNotes = [...notes];
            const now = Date.now();

            if (editingNote) {
                newNotes = notes.map(n =>
                    n.id === editingNote.id
                        ? { ...n, title: noteTitle, content: noteContent, updatedAt: now }
                        : n
                );
            } else {
                const newNote = {
                    id: now.toString(),
                    title: noteTitle,
                    content: noteContent,
                    createdAt: now,
                    updatedAt: now
                };
                newNotes = [newNote, ...notes];
            }

            await AsyncStorage.setItem('user-notes', JSON.stringify(newNotes));
            setNotes(newNotes.sort((a, b) => b.updatedAt - a.updatedAt));
            setModalVisible(false);
            clearNoteState();
        } catch (error) {
            Alert.alert('Hata', 'Not kaydedilemedi.');
        }
    };

    const deleteNote = (id) => {
        Alert.alert(
            'Notu Sil',
            'Bu notu silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        const newNotes = notes.filter(n => n.id !== id);
                        await AsyncStorage.setItem('user-notes', JSON.stringify(newNotes));
                        setNotes(newNotes);
                        if (editingNote && editingNote.id === id) {
                            setModalVisible(false);
                        }
                    }
                }
            ]
        );
    };

    const clearNoteState = () => {
        setEditingNote(null);
        setNoteTitle('');
        setNoteContent('');
    };

    const openEditModal = (note = null) => {
        if (note) {
            setEditingNote(note);
            setNoteTitle(note.title);
            setNoteContent(note.content);
        } else {
            clearNoteState();
        }
        setModalVisible(true);
    };

    const filteredNotes = notes.filter(n =>
    (n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const renderNoteItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.noteCard, { backgroundColor: theme?.colors?.card || '#ffffff' }]}
            onPress={() => openEditModal(item)}
        >
            <View style={styles.noteTop}>
                <Text style={[styles.noteTitle, { color: theme?.colors?.text || '#1e293b' }]} numberOfLines={1}>
                    {item.title || 'Başlıksız Not'}
                </Text>
                <TouchableOpacity onPress={() => deleteNote(item.id)}>
                    <Trash2 size={18} color={theme?.colors?.error || '#ef4444'} />
                </TouchableOpacity>
            </View>
            <Text style={[styles.noteSnippet, { color: theme?.colors?.textSecondary || '#64748b' }]} numberOfLines={2}>
                {item.content || 'İçerik yok'}
            </Text>
            <View style={styles.noteFooter}>
                <Clock size={12} color={theme?.colors?.textSecondary || '#64748b'} />
                <Text style={[styles.noteDate, { color: theme?.colors?.textSecondary || '#64748b' }]}>
                    {format(item.updatedAt, 'd MMMM yyyy, HH:mm', { locale: tr })}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8fafc' }]} edges={['top', 'left', 'right']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={[styles.header, { borderBottomColor: theme?.colors?.border || '#e2e8f0' }]}>
                <Text style={[styles.headerTitle, { color: theme?.colors?.text || '#1e293b' }]}>Notlarım</Text>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme?.colors?.primary || '#6366f1' }]}
                    onPress={() => openEditModal()}
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: theme?.colors?.card || '#ffffff' }]}>
                <Search size={20} color={theme?.colors?.textSecondary || '#64748b'} />
                <TextInput
                    style={[styles.searchInput, { color: theme?.colors?.text || '#1e293b' }]}
                    placeholder="Notlarda ara..."
                    placeholderTextColor={theme?.colors?.textSecondary || '#64748b'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={20} color={theme?.colors?.textSecondary || '#64748b'} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredNotes}
                renderItem={renderNoteItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <FileText size={80} color={theme?.colors?.border || '#e2e8f0'} />
                        <Text style={[styles.emptyText, { color: theme?.colors?.textSecondary || '#64748b' }]}>
                            {searchQuery ? 'Eşleşen not bulunamadı' : 'Henüz not eklenmedi'}
                        </Text>
                    </View>
                }
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme?.colors?.background || '#f8fafc' }]} edges={['top', 'left', 'right', 'bottom']}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <View style={[styles.modalHeader, { borderBottomColor: theme?.colors?.border || '#e2e8f0' }]}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalHeaderBtn}>
                                <ArrowLeft size={24} color={theme?.colors?.text || '#1e293b'} />
                            </TouchableOpacity>
                            <Text style={[styles.modalHeaderTitle, { color: theme?.colors?.text || '#1e293b' }]}>
                                {editingNote ? 'Notu Düzenle' : 'Yeni Not'}
                            </Text>
                            <TouchableOpacity onPress={saveNote} style={styles.modalHeaderBtn}>
                                <Save size={24} color={theme?.colors?.primary || '#6366f1'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            <TextInput
                                style={[styles.titleInput, { color: theme?.colors?.text || '#1e293b' }]}
                                placeholder="Başlık"
                                placeholderTextColor={theme?.colors?.textSecondary || '#64748b'}
                                value={noteTitle}
                                onChangeText={setNoteTitle}
                                multiline
                            />
                            <TextInput
                                style={[styles.contentInput, { color: theme?.colors?.text || '#1e293b' }]}
                                placeholder="Not yazmaya başlayın..."
                                placeholderTextColor={theme?.colors?.textSecondary || '#64748b'}
                                value={noteContent}
                                onChangeText={setNoteContent}
                                multiline
                                textAlignVertical="top"
                            />
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 15,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    listContent: {
        padding: 15,
        paddingBottom: 100,
    },
    noteCard: {
        padding: 15,
        borderRadius: 16,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    noteTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    noteTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
        marginRight: 10,
    },
    noteSnippet: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    noteFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    noteDate: {
        fontSize: 12,
        marginLeft: 5,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalHeaderBtn: {
        padding: 5,
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 15,
    },
    contentInput: {
        fontSize: 16,
        lineHeight: 24,
        minHeight: 200,
    }
});

export default NotesScreen;
