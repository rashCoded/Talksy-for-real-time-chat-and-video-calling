package com.talksy.repository;

import com.talksy.model.Message;
import com.talksy.model.MessageReaction;
import com.talksy.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    Optional<MessageReaction> findByMessageAndUser(Message message, User user);
}
