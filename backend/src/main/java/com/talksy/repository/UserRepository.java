package com.talksy.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.talksy.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    Boolean existsByUsername(String username);
    
    Boolean existsByEmail(String email);
    
    List<User> findByUsernameContainingIgnoreCase(String username);
    
    List<User> findByEmailContainingIgnoreCase(String email);
    
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :username, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%'))")
    List<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(
        @Param("username") String username, @Param("email") String email);
    
    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.online = :online, u.lastSeen = :lastSeen WHERE u.id = :userId")
    void updateUserOnlineStatus(@Param("userId") Long userId, @Param("online") boolean online, @Param("lastSeen") LocalDateTime lastSeen);
    
    List<User> findByOnlineTrue();
}