package com.talksy.repository;

import com.talksy.model.Message;
import com.talksy.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    
    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :user1 AND m.receiver = :user2) OR " +
           "(m.sender = :user2 AND m.receiver = :user1) " +
           "ORDER BY m.createdAt ASC")
    List<Message> findConversationBetweenUsers(@Param("user1") User user1, @Param("user2") User user2);
    
    @Query("SELECT m FROM Message m WHERE m.receiver = :user AND m.status != 'READ' ORDER BY m.createdAt DESC")
    List<Message> findUnreadMessagesForUser(@Param("user") User user);
    
    @Query("SELECT DISTINCT CASE " +
           "WHEN m.sender = :user THEN m.receiver " +
           "ELSE m.sender " +
           "END FROM Message m WHERE m.sender = :user OR m.receiver = :user " +
           "ORDER BY MAX(m.createdAt) DESC")
    List<User> findChatContactsForUser(@Param("user") User user);
    
    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :user OR m.receiver = :user) AND " +
           "m.content LIKE %:searchTerm% " +
           "ORDER BY m.createdAt DESC")
    List<Message> searchMessagesForUser(@Param("user") User user, @Param("searchTerm") String searchTerm);
    
    // Feature 3: Advanced Message Search and Statistics
    @Query("SELECT m FROM Message m WHERE " +
           "((m.sender = :user1 AND m.receiver = :user2) OR " +
           "(m.sender = :user2 AND m.receiver = :user1)) AND " +
           "m.content LIKE %:query% " +
           "ORDER BY m.createdAt DESC")
    List<Message> searchMessagesInConversation(@Param("user1") User user1, @Param("user2") User user2, @Param("query") String query);
    
    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :user OR m.receiver = :user) AND " +
           "(m.content LIKE %:query% OR m.fileName LIKE %:query%) " +
           "ORDER BY m.createdAt DESC")
    List<Message> searchUserMessages(@Param("user") User user, @Param("query") String query);
    
    // Statistics queries
    @Query("SELECT COUNT(m) FROM Message m WHERE m.sender = :user")
    Long countBySender(@Param("user") User user);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver = :user")
    Long countByReceiver(@Param("user") User user);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.receiver = :user AND m.status = :status")
    Long countByReceiverAndStatus(@Param("user") User user, @Param("status") Message.MessageStatus status);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE " +
           "(m.sender = :user OR m.receiver = :user) AND m.type = :type")
    Long countByUserAndType(@Param("user") User user, @Param("type") Message.MessageType type);
    
    // Additional utility queries
    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender = :user OR m.receiver = :user) AND " +
           "m.createdAt >= CURRENT_DATE " +
           "ORDER BY m.createdAt DESC")
    List<Message> findTodaysMessages(@Param("user") User user);
    
    @Query("SELECT m FROM Message m WHERE m.receiver = :user AND m.status = :status")
    List<Message> findByReceiverAndStatus(@Param("user") User user, @Param("status") Message.MessageStatus status);
}