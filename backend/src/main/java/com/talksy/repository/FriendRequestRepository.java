package com.talksy.repository;

import com.talksy.model.FriendRequest;
import com.talksy.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    
    // Check if a friend request already exists between two users
    @Query("SELECT fr FROM FriendRequest fr WHERE " +
           "(fr.sender.id = :userId1 AND fr.receiver.id = :userId2) OR " +
           "(fr.sender.id = :userId2 AND fr.receiver.id = :userId1)")
    Optional<FriendRequest> findBetweenUsers(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
    
    // Get all pending friend requests received by a user
    List<FriendRequest> findByReceiverAndStatus(User receiver, FriendRequest.FriendRequestStatus status);
    
    // Get all pending friend requests sent by a user
    List<FriendRequest> findBySenderAndStatus(User sender, FriendRequest.FriendRequestStatus status);
    
    // Get all accepted friend requests for a user (both sent and received)
    @Query("SELECT fr FROM FriendRequest fr WHERE " +
           "(fr.sender.id = :userId OR fr.receiver.id = :userId) AND " +
           "fr.status = :status")
    List<FriendRequest> findAcceptedFriendsForUser(@Param("userId") Long userId, 
                                                  @Param("status") FriendRequest.FriendRequestStatus status);
}