package com.talksy.repository;

import com.talksy.model.Call;
import com.talksy.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CallRepository extends JpaRepository<Call, Long> {
    
    @Query("SELECT c FROM Call c WHERE c.caller = :user OR c.receiver = :user ORDER BY c.startedAt DESC")
    List<Call> findCallsForUser(@Param("user") User user);
    
    @Query("SELECT c FROM Call c WHERE " +
           "(c.caller = :user1 AND c.receiver = :user2) OR " +
           "(c.caller = :user2 AND c.receiver = :user1) " +
           "ORDER BY c.startedAt DESC")
    List<Call> findCallsBetweenUsers(@Param("user1") User user1, @Param("user2") User user2);
    
    @Query("SELECT c FROM Call c WHERE c.receiver = :user AND c.status = 'RINGING'")
    List<Call> findIncomingCallsForUser(@Param("user") User user);
}